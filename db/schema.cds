using {
    managed,
    cuid,
//Currency,
//Country,
//Timezone,
//sap.common.CodeList
} from '@sap/cds/common';

namespace myisucontract;
// namespace-Entity.csv

@isRoot
@odata.containment: false // can exist independently and are not contained within another entity.
@UI.HiddenFilter  : false
entity IsuContract : cuid, managed {
    //--> From Managed and CUID
    //   "ID": "00bf7960-dc81-43c7-b91d-291d7e70b4db",
    //   "createdAt": "2022-10-30T21:34:44.000Z",
    //   "createdBy": "emma.tanaka",
    //   "modifiedAt": "2024-10-06T02:53:28.000Z",
    //   "modifiedBy": "admin@utilities.net",

    @Core.Immutable: true  @title: 'Contract ID'
    contractID      : String(20) not null;

    @description   : true  @title: 'Description'
    description     : String(255) not null;

    @title         : 'Customer Email' //@readonly
    @dataFormat    : 'EMAIL'
    customeremail   : String(255);

    @title         : 'Customer Website'
    @dataFormat    : 'URI'
    customerwebsite : String(255);

    @title: 'Enum Status'
    status          : Status;

    @title: 'Enum Priority'
    priority        : Priority;

    @title: 'Move In Date Time'
    moveinDate      : DateTime;

    @title: 'Move Out Date Time'
    moveoutDate     : DateTime;

    @title: 'Transfer Date'
    transferDate    : Date;

    @title: 'Number of Meters'
    noofmeters      : Integer;


    //   "moveinCharge_ID": "ca88a387-160c-499a-addf-07921fda2f9c",
    //   "usage_ID": "38d564e0-b198-4508-b116-4c998ee99d62",
    @title: 'Priority Move In'
    prioritymovein  : Boolean default true;

    //AMOUNT
    @title         : 'Move In Charge'
    @dataFormat    : 'AMOUNT'
    moveinCharge    : Composition of MoveInCharge;

    //Quantity
    @title         : 'Usage'
    @dataFormat    : 'QUANTITY'
    usage           : Composition of Usage;

//Transient, determined at runtime. Exposed in service.cds and deterrmined in service.js
//-->  formattedMoveInCharge
//-->  formattedUsage

// Not feasible for V2
//--> @title: 'Time Zone'
//--> timeZone        : Timezone; //timeZone_code

//--> @title: 'Country'
//--> country         : Country; //country_code

//--> @title: 'Currency'
//--> currency        : Currency; //currency_code

}

@isCnsEntity
entity MoveInCharge {
    key ID           : UUID;
        content      : Decimal(10, 3);
        currencyCode : TCurrencyCode;
}

@isCnsEntity: true
entity Usage {
    key ID      : UUID;
        content : Integer;
        uomCode : String;
}

// ─── Status Enum ──────────────────────────────────────────────────────────────
type Status         : String @assert.range enum {
    // key        = 'Value'
    OPEN = 'OPEN';
    IN_PROGRESS = 'IN_PROGRESS';
    ON_HOLD = 'ON_HOLD';
    COMPLETED = 'COMPLETED';
    CANCELLED = 'CANCELLED';
}

// ─── Priority Enum ────────────────────────────────────────────────────────────
type Priority       : String @assert.range enum {
    LOW = 'LOW';
    MEDIUM = 'MEDIUM';
    HIGH = 'HIGH';
    URGENT = 'URGENT';
}

type TUnitOfMeasure : String(20) @assert.range enum {
    EACH = 'EACH';
    KWH = 'KWH';
    M3 = 'M3';
    LITERS = 'LITERS';
    GALLONS = 'GALLONS';
}

type TCurrencyCode  : String @assert.range enum {
    USD = 'USD';
    EUR = 'EUR';
    GBP = 'GBP';
    JPY = 'JPY';
    AUD = 'AUD';
}
