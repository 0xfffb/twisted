enum ExceptionHandlerType {
    TRY = "try",
    CATCH = "catch",
    FINALLY = "finally",
}

interface ExceptionHandlerEntry {
    startOffset: number;
    endOffset: number;
    handlerOffset: number;
    type: ExceptionHandlerType;
}

class ExceptionTable{
    private entries: ExceptionHandlerEntry[];

    constructor() {
        this.entries = [];
    }

    public addTryEntry(startOffset: number, endOffset: number, handlerOffset: number) {
        this.addEntry(startOffset, endOffset, handlerOffset, ExceptionHandlerType.TRY);
    }

    public addCatchEntry(startOffset: number, endOffset: number, handlerOffset: number) {
        this.addEntry(startOffset, endOffset, handlerOffset, ExceptionHandlerType.CATCH);
    }

    public addFinallyEntry(startOffset: number, endOffset: number, handlerOffset: number) {
        this.addEntry(startOffset, endOffset, handlerOffset, ExceptionHandlerType.FINALLY);
    }

    public addEntry(startOffset: number, endOffset: number, handlerOffset: number, type: ExceptionHandlerType) {
        this.entries.push({ startOffset, endOffset, handlerOffset, type });
    }

    public getEntries() {
        return this.entries;
    }

    public resolve(offset: number) {
        return this.entries.find((entry) => offset >= entry.startOffset && offset < entry.endOffset);
    }

}

export default ExceptionTable;