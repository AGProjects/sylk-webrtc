const React = require('react');
const useEffect = React.useEffect;
const useState = React.useState;

const useResize = () => {
    const [myRef, setRef] = useState(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            if (!ignore) {
                setWidth(myRef.offsetWidth)
                setHeight(myRef.offsetHeight)
            }
        }
        let ignore = false;

        if (myRef) {
            window.addEventListener('resize', handleResize)
            handleResize()
        }

        return () => {
            ignore = true;
            window.removeEventListener('resize', handleResize)
        }
    }, [myRef])

    return [setRef, width, height]
}

export { useResize };
