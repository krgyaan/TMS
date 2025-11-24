import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function MockUploadDropzone({
    onClientUploadComplete,
    maxFiles = 5,
    maxSizeMB = 25,
}: {
    onClientUploadComplete?: (files: any[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const maxTotalSize = maxSizeMB * 1024 * 1024;

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const totalSize = acceptedFiles.reduce((acc, f) => acc + f.size, 0);

            if (acceptedFiles.length > maxFiles) {
                alert(`Max ${maxFiles} files allowed.`);
                return;
            }

            if (totalSize > maxTotalSize) {
                alert(`Max ${maxSizeMB} MB allowed.`);
                return;
            }

            setFiles(acceptedFiles);
            fakeUpload(acceptedFiles);
        },
        [maxFiles]
    );

    const fakeUpload = (acceptedFiles: File[]) => {
        setUploading(true);
        setProgress(0);

        let pct = 0;
        const interval = setInterval(() => {
            pct += 10;
            setProgress(pct);

            if (pct >= 100) {
                clearInterval(interval);
                setUploading(false);

                // fake metadata returned
                const result = acceptedFiles.map(file => ({
                    name: file.name,
                    size: file.size,
                    url: URL.createObjectURL(file), // temporary blob URL
                    uploadedAt: new Date().toISOString(),
                }));

                onClientUploadComplete?.(result);
            }
        }, 120);
    };

    const handleBrowse = (ev: React.ChangeEvent<HTMLInputElement>) => {
        if (ev.target.files) {
            onDrop(Array.from(ev.target.files));
        }
    };

    const onDragOver = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
    };

    const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        if (ev.dataTransfer.files) {
            onDrop(Array.from(ev.dataTransfer.files));
        }
    };

    return (
        <div>
            {/* DROPZONE */}
            <div
                onDragOver={onDragOver}
                onDrop={handleDrop}
                className="p-6 border-2 border-dashed rounded-md text-center cursor-pointer"
            >
                {!uploading && (
                    <>
                        <p>Drag & drop files here</p>
                        <div className="my-2">or</div>

                        <label className="cursor-pointer">
                            <input type="file" multiple className="hidden" onChange={handleBrowse} />
                            <Button type="button">Browse Files</Button>
                        </label>
                    </>
                )}

                {uploading && (
                    <div>
                        <div className="text-sm mb-2">Uploading...</div>
                        <div className="w-full bg-gray-200 h-2 rounded">
                            <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEWS */}
            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="font-semibold">Files Selected</div>
                    {files.map((file, i) => (
                        <div key={i} className="flex justify-between items-center p-2 border rounded">
                            <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
