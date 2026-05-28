using myisucontract as db from '../db/schema';

//customer.ssc.service.<IsuContractCap>Service

@path: '/IsuContractPath'
service IsuContractCap {
    entity IsuContracts as
        projection on db.IsuContract {
            *,
            null as formattedMoveInCharge : String  @title: 'Move In Charge'  @Core.Computed,
            null as formattedUsage        : String  @title: 'Usage'           @Core.Computed
        // @Core.Computed tells CAP: Don't include in INSERT/UPDATE,Don't try to persist in draft table,Value is always computed at read time
        }
}
