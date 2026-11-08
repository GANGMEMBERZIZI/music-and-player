export type Result<T,E=Error> ={ok:true,value:T}|{ok:false,error:E};

export function safeRun<T,E=Error>(fn:()=>T):Result<T,E>{
    try{
        return {ok:true,value:fn()};
    }catch(error){
        return {ok:false,error:error as E}
    }
}
export async function safeAsyncRun<T,E=Error>(fn:()=>Promise<T>):Promise<Result<T,E>>{
    try{
        const value=await fn();
        return {ok:true,value:value};
    }catch(error){
        return {ok:false,error:error as E};

    }
}

export class ResultHandler<T, E = Error> {
    private result: Result<T, E>;
    constructor(result: Result<T, E>) {
        this.result = result;
    }
    map<U>(fn: (value: T) => U): ResultHandler<U, E> {
        if (this.result.ok) {
            return new ResultHandler({ ok: true, value: fn(this.result.value) });
        }
        return new ResultHandler(this.result as Result<U, E>);
    }
    mapErr<F>(fn: (error: E) => F): ResultHandler<T, F> {
        if (!this.result.ok) {
            return new ResultHandler({ ok: false, error: fn((this.result as { ok: false; error: E }).error) });
        }
        return new ResultHandler(this.result as Result<T, F>);
    }
    unwrap(): T {
        if (this.result.ok) return this.result.value;
        throw new Error(`Unwrap failed: ${String((this.result as { ok: false; error: E }).error)}`);
    }
    get(): Result<T, E> {
        return this.result;
    }
}