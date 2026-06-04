const { usePrevious } = require('./');

const useHasChanged = (value) => {
    const previousValue = usePrevious(value);
    const current = value.map(m => `${m.id}:${JSON.stringify(m.metadata ?? '')}`).join(',');
    const previous = previousValue?.map(m => `${m.id}:${JSON.stringify(m.metadata ?? '')}`).join(',') ?? '';
    return current !== previous;
};

export { useHasChanged };

