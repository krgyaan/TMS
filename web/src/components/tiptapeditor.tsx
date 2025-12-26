import React, { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorContent, useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";

import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Link2,
    Unlink,
    Undo,
    Redo,
    Highlighter,
    AlertCircle,
    ChevronDown,
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Quote,
    Code,
    Minus,
    CornerDownLeft,
} from "lucide-react";

import "@/components/styles/tiptap.css";

interface TiptapEditorProps {
    value: string;
    onChange: (html: string) => void;
    error?: string;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    disabled?: boolean;
    characterLimit?: number;
    showWordCount?: boolean;
    showCharacterCount?: boolean;
    className?: string;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    icon: React.ElementType;
    tooltip: string;
    shortcut?: string;
    disabled?: boolean;
}

const ToolbarButton = ({ onClick, isActive = false, icon: Icon, tooltip, shortcut, disabled = false }: ToolbarButtonProps) => (
    <TooltipProvider delayDuration={300}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClick}
                    disabled={disabled}
                    className={`
                        h-8 w-8 p-0 
                        transition-all duration-150 ease-in-out
                        ${isActive ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                    `}
                >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only">{tooltip}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>{tooltip}</span>
                {shortcut && (
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {shortcut}
                    </kbd>
                )}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ToolbarDivider = () => <Separator orientation="vertical" className="mx-1.5 h-6 bg-border/60" />;

const ToolbarGroup = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-0.5">{children}</div>;

export function TiptapEditor({
    value,
    onChange,
    error,
    placeholder = "Write something...",
    minHeight = "180px",
    maxHeight = "400px",
    disabled = false,
    characterLimit,
    showWordCount = true,
    showCharacterCount = true,
    className = "",
}: TiptapEditorProps) {
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            Typography,
            Image,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-primary underline cursor-pointer hover:text-primary/80 transition-colors",
                },
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-editor-empty",
            }),
            CharacterCount.configure({
                limit: characterLimit,
            }),
        ],
        content: value,
        editable: !disabled,
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
        onFocus() {
            setIsFocused(true);
        },
        onBlur() {
            setIsFocused(false);
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none px-4 py-3`,
                style: `min-height: ${minHeight}; max-height: ${maxHeight}; overflow-y: auto;`,
            },
        },
    });

    // Sync external value changes
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, false);
        }
    }, [value, editor]);

    // Handle link insertion
    const handleLinkInsert = useCallback(() => {
        if (!editor || !linkUrl) return;

        if (linkUrl) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
        }

        setLinkUrl("");
        setLinkText("");
        setLinkDialogOpen(false);
    }, [editor, linkUrl, linkText]);

    const openLinkDialog = useCallback(() => {
        if (!editor) return;

        const previousUrl = editor.getAttributes("link").href || "";
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, "");

        setLinkUrl(previousUrl);
        setLinkText(selectedText);
        setLinkDialogOpen(true);
    }, [editor]);

    // Loading state
    if (!editor) {
        return (
            <div className={`space-y-2 w-full ${className}`}>
                <div className="h-10 rounded-lg border bg-muted/40 animate-pulse" />
                <div className="border rounded-lg bg-muted/20 animate-pulse" style={{ minHeight }} />
            </div>
        );
    }

    const wordCount = editor.storage.characterCount?.words() || 0;
    const characterCount = editor.storage.characterCount?.characters() || 0;

    const getCurrentHeadingLevel = () => {
        if (editor.isActive("heading", { level: 1 })) return "Heading 1";
        if (editor.isActive("heading", { level: 2 })) return "Heading 2";
        if (editor.isActive("heading", { level: 3 })) return "Heading 3";
        return "Paragraph";
    };

    return (
        <div className={`space-y-2 w-full ${className}`}>
            {/* TOOLBAR */}
            <div
                className={`
                    rounded-lg border bg-muted/30 p-1.5
                    transition-all duration-200 ease-in-out
                    ${isFocused ? "border-primary/50 shadow-sm" : "border-border"}
                    ${disabled ? "opacity-50 pointer-events-none" : ""}
                `}
            >
                <div className="flex flex-wrap items-center gap-1">
                    {/* Block Type Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={disabled} className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground">
                                <Pilcrow className="h-4 w-4" />
                                <span className="text-xs font-medium hidden sm:inline">{getCurrentHeadingLevel()}</span>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive("paragraph") ? "bg-accent" : ""}>
                                <Pilcrow className="h-4 w-4 mr-2" />
                                Paragraph
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={editor.isActive("heading", { level: 1 }) ? "bg-accent" : ""}
                            >
                                <Heading1 className="h-4 w-4 mr-2" />
                                Heading 1
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
                            >
                                <Heading2 className="h-4 w-4 mr-2" />
                                Heading 2
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={editor.isActive("heading", { level: 3 }) ? "bg-accent" : ""}
                            >
                                <Heading3 className="h-4 w-4 mr-2" />
                                Heading 3
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ToolbarDivider />

                    {/* Text Formatting */}
                    <ToolbarGroup>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive("bold")}
                            icon={Bold}
                            tooltip="Bold"
                            shortcut="⌘B"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive("italic")}
                            icon={Italic}
                            tooltip="Italic"
                            shortcut="⌘I"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            isActive={editor.isActive("underline")}
                            icon={UnderlineIcon}
                            tooltip="Underline"
                            shortcut="⌘U"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            isActive={editor.isActive("strike")}
                            icon={Strikethrough}
                            tooltip="Strikethrough"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                            isActive={editor.isActive("highlight")}
                            icon={Highlighter}
                            tooltip="Highlight"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            isActive={editor.isActive("code")}
                            icon={Code}
                            tooltip="Inline Code"
                            shortcut="⌘E"
                            disabled={disabled}
                        />
                    </ToolbarGroup>

                    <ToolbarDivider />

                    {/* Alignment */}
                    <ToolbarGroup>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign("left").run()}
                            isActive={editor.isActive({ textAlign: "left" })}
                            icon={AlignLeft}
                            tooltip="Align Left"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign("center").run()}
                            isActive={editor.isActive({ textAlign: "center" })}
                            icon={AlignCenter}
                            tooltip="Align Center"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign("right").run()}
                            isActive={editor.isActive({ textAlign: "right" })}
                            icon={AlignRight}
                            tooltip="Align Right"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                            isActive={editor.isActive({ textAlign: "justify" })}
                            icon={AlignJustify}
                            tooltip="Justify"
                            disabled={disabled}
                        />
                    </ToolbarGroup>

                    <ToolbarDivider />

                    {/* Lists & Blocks */}
                    <ToolbarGroup>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            isActive={editor.isActive("bulletList")}
                            icon={List}
                            tooltip="Bullet List"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            isActive={editor.isActive("orderedList")}
                            icon={ListOrdered}
                            tooltip="Numbered List"
                            disabled={disabled}
                        />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive("blockquote")}
                            icon={Quote}
                            tooltip="Blockquote"
                            disabled={disabled}
                        />
                        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} tooltip="Horizontal Rule" disabled={disabled} />
                        <ToolbarButton onClick={() => editor.chain().focus().setHardBreak().run()} icon={CornerDownLeft} tooltip="Line Break" shortcut="⇧↵" disabled={disabled} />
                    </ToolbarGroup>

                    <ToolbarDivider />

                    {/* Links */}
                    <ToolbarGroup>
                        <ToolbarButton onClick={openLinkDialog} isActive={editor.isActive("link")} icon={Link2} tooltip="Add Link" shortcut="⌘K" disabled={disabled} />
                        <ToolbarButton
                            onClick={() => editor.chain().focus().unsetLink().run()}
                            icon={Unlink}
                            tooltip="Remove Link"
                            disabled={disabled || !editor.isActive("link")}
                        />
                    </ToolbarGroup>

                    <ToolbarDivider />

                    {/* History */}
                    <ToolbarGroup>
                        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} tooltip="Undo" shortcut="⌘Z" disabled={disabled || !editor.can().undo()} />
                        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} tooltip="Redo" shortcut="⌘⇧Z" disabled={disabled || !editor.can().redo()} />
                    </ToolbarGroup>

                    {/* Stats */}
                    {(showWordCount || showCharacterCount) && (
                        <div className="ml-auto flex items-center gap-3 px-2">
                            {showWordCount && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {wordCount} {wordCount === 1 ? "word" : "words"}
                                </span>
                            )}
                            {showCharacterCount && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {characterCount}
                                    {characterLimit && `/${characterLimit}`} chars
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* EDITOR */}
            <div
                className={`
                    relative border rounded-lg bg-card 
                    transition-all duration-200 ease-in-out
                    ${error ? "border-destructive ring-1 ring-destructive/20" : isFocused ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-border/80"}
                    ${disabled ? "opacity-60 cursor-not-allowed bg-muted/30" : ""}
                `}
            >
                <EditorContent
                    editor={editor}
                    className={`
                        tiptap
                        [&_.ProseMirror]:outline-none
                        [&_.ProseMirror_*::selection]:!bg-primary/30
                        [&_.ProseMirror_*::-moz-selection]:!bg-primary/30
                        [&_.is-editor-empty:first-child::before]:text-muted-foreground
                        [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                        [&_.is-editor-empty:first-child::before]:float-left
                        [&_.is-editor-empty:first-child::before]:pointer-events-none
                        [&_.is-editor-empty:first-child::before]:h-0
                    `}
                />

                {/* Character limit indicator */}
                {characterLimit && characterCount > characterLimit * 0.9 && (
                    <div className="absolute bottom-2 right-2">
                        <span
                            className={`
                                text-xs font-medium px-2 py-0.5 rounded-full
                                ${characterCount > characterLimit ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}
                            `}
                        >
                            {characterCount > characterLimit ? `${characterCount - characterLimit} over limit` : `${characterLimit - characterCount} remaining`}
                        </span>
                    </div>
                )}
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <Alert variant="destructive" className="py-2 px-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                    </div>
                </Alert>
            )}

            {/* LINK DIALOG */}
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Insert Link</DialogTitle>
                        <DialogDescription>Add a URL to create a hyperlink for the selected text.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="link-url">URL</Label>
                            <Input
                                id="link-url"
                                type="url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleLinkInsert();
                                    }
                                }}
                            />
                        </div>
                        {linkText && (
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Selected Text</Label>
                                <p className="text-sm bg-muted px-3 py-2 rounded-md truncate">{linkText}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleLinkInsert} disabled={!linkUrl}>
                            Insert Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
