const { usePrevious } = require('./');

const useHasChanged = (value) => {
    const previousValue = usePrevious(value);
    return JSON.stringify(previousValue) !== JSON.stringify(value);
}

export { useHasChanged };

