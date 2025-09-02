import { useEffect, useRef } from "react";

type DocumentTitleProps = {
    title: string;
};

export function DocumentTitle({ title }: DocumentTitleProps) {
    const previousTitleRef = useRef<string>(document.title);

    useEffect(() => {
        const previousTitle = previousTitleRef.current;
        if (title && document.title !== title) {
            document.title = title;
        }
        return () => {
            document.title = previousTitle;
        };
    }, [title]);

    return null;
}
