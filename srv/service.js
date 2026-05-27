const cds = require('@sap/cds');

module.exports = class IsuContractService extends cds.ApplicationService {

    async init() {

        // ── Helpers ────────────────────────────────────────────────────────────────
        const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidUrl = (url) => /^https?:\/\/.+\..+/.test(url);

        // ══════════════════════════════════════════════════════════════════
        // BEFORE — validation, auto-fill, reject requests before DB operation
        // ══════════════════════════════════════════════════════════════════
        // const { IsuContracts } = this.entities;
        this.before('CREATE', 'IsuContracts', (req) => {
            const { contractID, description, customeremail, customerwebsite, moveinDate, moveoutDate } = req.data;
            ///-- Validation -- ///
            // Validate required fields
            if (!description) req.error(400, 'Description is required.');

            // Validate noofmeters -- ANOTHER WAY
            if (req.data.noofmeters !== undefined && req.data.noofmeters < 0) {
                req.error(400, 'Number of meters cannot be negative.');
            }
            //Validate email and Website
            if (customeremail && !isValidEmail(customeremail)) req.error(400, `Invalid email: "${customeremail}".`);
            if (customerwebsite && !isValidUrl(customerwebsite)) req.error(400, `Invalid URL: "${customerwebsite}".`);

            ////-- Default values -- ////
            // Auto-generate contractID if not provided
            //if (!contractID) 
            req.data.contractID = 'CONTRACT-' + Date.now();

            //default status if not provided
            if (!req.data.status) req.data.status = 'OPEN';
            //default priority if not provided
            if (!req.data.priority) req.data.priority = 'LOW';
            // ── Default moveinDate to today ────────────────────────────────────
            if (!req.data.moveinDate) {
                const today = new Date();
                req.data.moveinDate = today.toISOString();  // e.g. "2026-05-27T00:00:00.000Z"
            }

            // ── Default moveoutDate to 1 year from today ───────────────────────
            if (!req.data.moveoutDate) {
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                req.data.moveoutDate = oneYearFromNow.toISOString();  // e.g. "2027-05-27T00:00:00.000Z"
            }

        });

        this.before('READ', 'IsuContracts', (req) => {
            console.log(`[BEFORE READ] query: ${JSON.stringify(req.query)}`);
        });

        this.before('UPDATE', 'IsuContracts', async (req) => {
            const { contractID, noofmeters, status, customeremail } = req.data;
            const dataStr = JSON.stringify(req.data);
            //req.data {"noofmeters":3, "ID":"014b072a-a9bc-4d1c-bd66-c34ecc5fd0b9"}     
            const id = req.data.ID ?? req.params?.[0]?.ID ?? req.params?.[0];
            if (id) {
                //contractID has @Core.Immutable: true in your schema, therefore it will not come in req.data for UPDATE
                //hence pulling from DB to get contractID for error message if needed
                const existing = await SELECT.one
                    .from('myisucontract.IsuContract')
                    .where({ ID: id });
                if (existing) {
                    if (noofmeters !== undefined && noofmeters < 0) {
                        req.error(400, `Number of meters cannot be negative for the contract "${existing?.contractID}".`);
                    }
                }
            }

            // Validate Status
            if (status !== undefined && !status) { // not undefined is important to check if the tag is sent during update
                req.error(400, 'Status is required.');
            }

            //Validate Email and Website
            if (customeremail !== undefined && !isValidEmail(customeremail)) req.error(400, `Invalid email: "${customeremail}".`);
            if (req.data.customerwebsite !== undefined && !isValidUrl(req.data.customerwebsite)) req.error(400, `Invalid URL: "${req.data.customerwebsite}".`);


            console.log(`[BEFORE UPDATE] ID: ${req.data.ID}`);
        });

        this.before('DELETE', 'IsuContracts', async (req) => {
            //in req.body we only have ID, to get contractID, status etc we need to read from DB
            const contract = await SELECT.one.from('myisucontract.IsuContract')
                .where({ ID: req.data.ID });

            // Block deletion of active contracts
            if (contract?.status === 'IN_PROGRESS') {
                req.error(400, `Cannot delete contract "${contract.contractID}" — status is IN_PROGRESS.`);
            }

            console.log(`[BEFORE DELETE] ID: ${req.data.ID}`);
        });

        // ══════════════════════════════════════════════════════════════════
        // ON handlers — REPLACES the default DB operation
        // Use for: custom logic, calling external APIs, overriding default behavior
        // Always call next() to proceed with default behavior
        // ══════════════════════════════════════════════════════════════════

        this.on('CREATE', 'IsuContracts', async (req, next) => {
            console.log(`[ON CREATE] creating contract: ${req.data.contractID}`);
            // Example: call external API before saving
            // await notifyExternalSystem(req.data);
            return next();
        });

        this.on('READ', 'IsuContracts', async (req, next) => {
            console.log(`[ON READ] fetching contracts`);
            return next();
        });

        this.on('UPDATE', 'IsuContracts', async (req, next) => {
            console.log(`[ON UPDATE] updating ID: ${req.data.ID}`);
            // Example: audit trail
            // await auditLog({ entity: 'IsuContract', id: req.data.ID, changes: req.data });
            return next();
        });

        this.on('DELETE', 'IsuContracts', async (req, next) => {
            console.log(`[ON DELETE] deleting ID: ${req.data.ID}`);
            // Example: notify external system
            // await notifyExternalSystem({ deleted: req.data.ID });
            return next();
        });

        // ═══════════════════════════════════════════════════════════════════════
        // AFTER handlers — run AFTER the DB operation
        // Use for: post-processing, notifications, logging, enriching response
        // ═══════════════════════════════════════════════════════════════════════
        this.after('CREATE', 'IsuContracts', (contract) => {
            console.log(`[AFTER CREATE] created: ${contract.contractID} | ID: ${contract.ID}`);
            // sendEmail(`New contract created: ${contract.contractID}`);
        });

        this.after('READ', 'IsuContracts', async (results) => {
            // Enrich each contract with formatted move-in charge and usage
            const contracts = Array.isArray(results) ? results : [results];

            await Promise.all(contracts.map(async contract => {
                if (!contract) return;
                //format move-in charge
                let moveInCharge = contract.moveinCharge;
                if (!moveInCharge && contract.moveinCharge_ID) {
                    moveInCharge = await SELECT.one
                        .from('myisucontract.MoveInCharge')
                        .where({ ID: contract.moveinCharge_ID });
                }

                if (moveInCharge) {
                    const { currencyCode, content } = moveInCharge;
                    const amount = content !== undefined
                        ? Number(content).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                        : null;
                    contract.formattedMoveInCharge = (currencyCode && amount !== null)
                        ? `${currencyCode} ${amount}`       // e.g. "USD 1,250.500"
                        : currencyCode ?? amount ?? null;
                } else {
                    contract.formattedMoveInCharge = null;
                }
                //Format usage 
                let usage = contract.usage;
                if (!usage && contract.usage_ID) {
                    usage = await SELECT.one
                        .from('myisucontract.Usage')
                        .where({ ID: contract.usage_ID });
                }

                if (usage) {
                    const { content, uomCode } = usage;
                    const amount = content !== undefined
                        ? Number(content).toLocaleString('en-US')
                        : null;
                    contract.formattedUsage = (amount !== null && uomCode)
                        ? `${amount} ${uomCode.toUpperCase()}`    // e.g. "42,000 kWh"
                        : uomCode?.toUpperCase() ?? amount ?? null;
                } else {
                    contract.formattedUsage = null;
                }
            }));
        });

        this.after('UPDATE', 'IsuContracts', (_, req) => {
            console.log(`[AFTER UPDATE] updated ID: ${req.data.ID}`);
            // syncToExternalSystem(req.data);
        });

        this.after('DELETE', 'IsuContracts', (_, req) => {
            console.log(`[AFTER DELETE] deleted ID: ${req.data.ID}`);
            // removeFromSearchIndex(req.data.ID);
        });
        return super.init();
    }
};