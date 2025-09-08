import * as React from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { FieldWrapper } from "./FieldWrapper"
import { cn } from "@/lib/utils"

// FilePond React component
import { FilePond } from "react-filepond"
import { registerPlugin } from "filepond"
// Plugins: validate file types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – plugin has no bundled types in some versions
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type"
import "filepond/dist/filepond.min.css"

// Use 'any' for react-filepond prop types to avoid tight coupling on type exports
type FileUploadFieldBaseProps = Omit<any, "files" | "name" | "onupdatefiles"> & {
  allowMultiple?: boolean
  acceptedFileTypes?: string[]
  allowFileTypeValidation?: boolean
  layout?: "list" | "grid"
  gridCols?: 2 | 3 | 4 | 5
  truncateFilenames?: boolean
  className?: string
}

type FileUploadFieldProps<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
> = FileUploadFieldBaseProps & {
    control: Control<TFieldValues>
    name: TName
    label: React.ReactNode
    description?: React.ReactNode
}

export function FileUploadField<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>,
>({ control, name, label, description, allowMultiple, acceptedFileTypes, allowFileTypeValidation, layout, gridCols, truncateFilenames, className, ...pondProps }: FileUploadFieldProps<TFieldValues, TName>) {
  return (
    <FieldWrapper control={control} name={name} label={label} description={description} className={className}>
      {(field) => (
        <FileUpload
          value={field.value}
          onChange={field.onChange}
          allowMultiple={allowMultiple}
          acceptedFileTypes={acceptedFileTypes}
          allowFileTypeValidation={allowFileTypeValidation}
          layout={layout}
          gridCols={gridCols}
          truncateFilenames={truncateFilenames}
          {...pondProps}
        />
      )}
    </FieldWrapper>
  )
}

function FileUpload({
    value,
    onChange,
  allowMultiple,
  acceptedFileTypes,
  allowFileTypeValidation,
  layout,
  gridCols,
  truncateFilenames,
  className,
  ...pondProps
}: {
  value: unknown
  onChange: (v: unknown) => void
  allowMultiple?: boolean
  acceptedFileTypes?: string[]
  allowFileTypeValidation?: boolean
  layout?: "list" | "grid"
  gridCols?: 2 | 3 | 4 | 5
  truncateFilenames?: boolean
} & Omit<any, "files" | "name" | "onupdatefiles">) {
  const pondRef = React.useRef<FilePond | null>(null)
  const [items, setItems] = React.useState<any[]>([])

    // When form resets, clear FilePond if the value becomes empty
    React.useEffect(() => {
        const empty = value == null || (Array.isArray(value) && value.length === 0)
        if (empty) {
            try {
                // remove all files silently
                // @ts-expect-error – FilePond instance shape is from the underlying lib
                pondRef.current?.removeFiles?.()
            } catch { }
            setItems([])
        }
    }, [value])

  const cols = gridCols ?? 3
  const gridClass =
    layout === "grid"
      ? cn(
          "[&_.filepond--list]:flex [&_.filepond--list]:flex-wrap [&_.filepond--list]:-m-2 [&_.filepond--item]:m-2",
          cols === 2 && "[&_.filepond--item]:w-[calc(50%-1rem)]",
          cols === 3 && "[&_.filepond--item]:w-[calc(33.333%-1rem)]",
          cols === 4 && "[&_.filepond--item]:w-[calc(25%-1rem)]",
          cols === 5 && "[&_.filepond--item]:w-[calc(20%-1rem)]"
        )
      : undefined

  const truncateClass =
    truncateFilenames !== false
      ? "[&_.filepond--file-info-main]:whitespace-nowrap [&_.filepond--file-info-main]:overflow-hidden [&_.filepond--file-info-main]:text-ellipsis"
      : undefined

  return (
    <div
      className={cn(
        "[&_.filepond--panel-root]:bg-background [&_.filepond--drop-label]:text-muted-foreground",
        gridClass,
        truncateClass,
        className
      )}
    >
      <FilePond
        // @ts-expect-error – react-filepond ref typing
        ref={pondRef}
        files={items}
        onupdatefiles={(fileItems) => {
          setItems(fileItems)
          const files = fileItems
            .map((f) => f.file as File | null)
            .filter(Boolean) as File[]
          onChange(allowMultiple ? files : files[0] ?? null)
        }}
        allowMultiple={allowMultiple}
        name="files" // used for the internal input element
        acceptedFileTypes={acceptedFileTypes}
        // Enable validation if acceptedFileTypes provided
        allowFileTypeValidation={allowFileTypeValidation ?? (acceptedFileTypes != null)}
        labelFileTypeNotAllowed="File type not allowed"
        fileValidateTypeLabelExpectedTypes="Expects {allTypes}"
        labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
        credits={false}
        {...pondProps}
      />
    </div>
  )
}

export default FileUploadField

// Register plugins once at module load
registerPlugin(FilePondPluginFileValidateType)
