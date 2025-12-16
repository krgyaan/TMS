import React from "react";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Separator } from "@/components/ui/separator";
import { EditorContent, useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Link2, Unlink, Undo, Redo } from "lucide-react";

import "@/tiptap.css";

const iconClass = "h-4 w-4";

export function TiptapEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight,
            Typography,
            Image,
            Link.configure({ openOnClick: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder: "Write details here..." }),
        ],
        content: value,
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
    });

    if (!editor) return <div>Loading editor…</div>;

    return (
        <div className="space-y-1.5 w-full">
            {/* COMPACT TOOLBAR */}
            <Menubar className="h-9 rounded-md border bg-muted px-1">
                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <Bold className={`${iconClass} ${editor.isActive("bold") ? "text-primary" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <Italic className={`${iconClass} ${editor.isActive("italic") ? "text-primary" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <UnderlineIcon
                            className={`${iconClass} ${editor.isActive("underline") ? "text-primary" : ""}`}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                        />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <Strikethrough className={`${iconClass} ${editor.isActive("strike") ? "text-primary" : ""}`} onClick={() => editor.chain().focus().toggleStrike().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <List className={`${iconClass} ${editor.isActive("bulletList") ? "text-primary" : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1">
                        <ListOrdered
                            className={`${iconClass} ${editor.isActive("orderedList") ? "text-primary" : ""}`}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <MenubarMenu>
                    <MenubarTrigger
                        className="px-2 py-1"
                        onClick={() => {
                            const url = prompt("Enter URL");
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }}
                    >
                        <Link2 className={`${iconClass} ${editor.isActive("link") ? "text-primary" : ""}`} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1" onClick={() => editor.chain().focus().unsetLink().run()}>
                        <Unlink className={iconClass} />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1" onClick={() => editor.chain().focus().undo().run()}>
                        <Undo className={iconClass} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger className="px-2 py-1" onClick={() => editor.chain().focus().redo().run()}>
                        <Redo className={iconClass} />
                    </MenubarTrigger>
                </MenubarMenu>
            </Menubar>

            {/* COMPACT EDITOR */}
            <div className="border rounded-md p-2 bg-card min-h-[180px]">
                <EditorContent editor={editor} className="tiptap" />
            </div>
        </div>
    );
}
