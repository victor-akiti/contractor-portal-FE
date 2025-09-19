import { useEffect, useState } from "react";


function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup timeout if value changes before delay
        return () => clearTimeout(timeoutId);
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;