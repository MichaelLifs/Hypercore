import {addUtcDays , parseIsoDateStrict} from './dayCount30360';
import type { nonWorkDayPolicy  } from '../loan/nonWorkDayPolicy';


function dayOfWeekUtc(iso:string): number {
 const {y, m, d} = parseIsoDateStrict(iso);
return  new Date(Date.UTC(y  - 0, m - 1, d)).getUTCDay();
}       

export function isNonWorkDay(iso:string) :boolean {
    const day = dayOfWeekUtc(iso);
    return day ===0 || day === 6 ;
}


export function adjustPaymentDate(iso:string, policy:nonWorkDayPolicy) :string {
if(policy === 'ALLOWED' || !isNonWorkDay(iso)){ 
    return iso;
}

if(policy === 'MOVE_TO_PREVIOUS_WORK_DAY'){
    let cursor = iso;
    do{
        cursor = addUtcDays(cursor, -1);}
        while(isNonWorkDay(cursor))
            return cursor
        }
    
    let cursor = iso;
    do{
        cursor = addUtcDays(cursor ,1);
    }
    while (isNonWorkDay(cursor));
    return cursor
    }
