export class Promise<T> {
    #state: PromiseState<T> = { status: "pending" };

    #onfulfilled: Array<ThenFn<T, unknown>> = [];
    #onrejected: Array<CatchFn<unknown>> = [];

    constructor(executor: ExecutorFn<T>) {
        executor(this.#resolve, this.#reject);
    }

    #resolve: ResolveFn<T> = (value) => {
        if (isPromiseLike(value)) {
            value.then(this.#resolve, this.#reject);
            return;
        }

        this.#state = { status: "fulfilled", value };

        for (const fn of this.#onfulfilled) {
            fn(value);
        }
    };

    #reject: RejectFn = (reason) => {
        if (isPromiseLike(reason)) {
            reason.then(this.#reject, this.#reject);
            return;
        }

        this.#state = { status: "rejected", reason };

        for (const fn of this.#onrejected) {
            fn(reason);
        }
    };

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ThenFn<T, TResult1> | undefined,
        onrejected?: CatchFn<TResult2> | undefined
    ): Promise<TResult1 | TResult2> {
        return new Promise((resolve, reject) => {
            switch (this.#state.status) {
                case "pending":
                    this.#onfulfilled.push((value) => {
                        if (onfulfilled) {
                            try {
                                resolve(onfulfilled(value));
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            resolve(value as unknown as TResult1);
                        }
                    });
                    this.#onrejected.push((reason) => {
                        if (onrejected) {
                            try {
                                resolve(onrejected(reason));
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            reject(reason);
                        }
                    });
                    break;
                case "fulfilled":
                    const value = this.#state.value;
                    queueMicrotask(() => {
                        if (onfulfilled) {
                            try {
                                resolve(onfulfilled(value));
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            resolve(value as unknown as TResult1);
                        }
                    });
                    break;
                case "rejected":
                    const reason = this.#state.reason;
                    queueMicrotask(() => {
                        if (onrejected) {
                            try {
                                resolve(onrejected(reason));
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject(reason);
                        }
                    });
                    break;
            }
        });
    }

    catch<TResult = never>(
        onrejected?: CatchFn<TResult> | undefined
    ): Promise<T | TResult> {
        return new Promise((resolve, reject) => {
            switch (this.#state.status) {
                case "pending":
                    this.#onfulfilled.push((value) => {
                        resolve(value as unknown as TResult);
                    });
                    this.#onrejected.push((reason) => {
                        if (onrejected) {
                            try {
                                resolve(onrejected(reason));
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            reject(reason);
                        }
                    });
                    break;
                case "fulfilled":
                    const value = this.#state.value;
                    queueMicrotask(() => {
                        resolve(value as unknown as TResult);
                    });
                    break;
                case "rejected":
                    const reason = this.#state.reason;
                    queueMicrotask(() => {
                        if (onrejected) {
                            try {
                                resolve(onrejected(reason));
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject(reason);
                        }
                    });
                    break;
            }
        });
    }

    finally(onfinally: FinallyFn = () => {}): Promise<T> {
        return new Promise((resolve, reject) => {
            switch (this.#state.status) {
                case "pending":
                    this.#onfulfilled.push((value) => {
                        try {
                            onfinally();
                        } catch (error) {
                            reject(error);
                        }
                        resolve(value);
                    });
                    this.#onrejected.push((reason) => {
                        try {
                            onfinally();
                        } catch (error) {
                            reject(error);
                        }
                        reject(reason);
                    });
                    break;
                case "fulfilled":
                    const value = this.#state.value;
                    queueMicrotask(() => {
                        try {
                            onfinally();
                        } catch (error) {
                            reject(error);
                        }
                        resolve(value);
                    });
                    break;
                case "rejected":
                    const reason = this.#state.reason;
                    queueMicrotask(() => {
                        try {
                            onfinally();
                        } catch (error) {
                            reject(error);
                        }
                        reject(reason);
                    });
                    break;
            }
        });
    }
}

type PromiseState<T> =
    | { status: "pending" }
    | { status: "fulfilled"; value: T }
    | { status: "rejected"; reason: any };

export function isPromiseLike<T>(value: any): value is PromiseLike<T> {
    return value && typeof value.then === "function";
}

export interface PromiseLike<T> {
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ThenFn<T, TResult1> | undefined,
        onrejected?: CatchFn<TResult2> | undefined
    ): Promise<TResult1 | TResult2>;
}

export type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
export type RejectFn = (reason?: any) => void;
export type ExecutorFn<T> = (resolve: ResolveFn<T>, reject: RejectFn) => void;

export type ThenFn<T, TResult> = (value: T) => TResult | PromiseLike<TResult>;
export type CatchFn<TResult> = (reason: any) => TResult | PromiseLike<TResult>;
export type FinallyFn = () => void;
