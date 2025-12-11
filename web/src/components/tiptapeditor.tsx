import React from "react";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from "@/components/ui/menubar";

import { Button } from "@/components/ui/button";
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

import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Link2, Unlink, ImageIcon, Undo, Redo, Heading2 } from "lucide-react";

import "@/tiptap.css"; // ← your styling

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
        <div className="space-y-2 w-full">
            {/* SHADCN MENUBAR — CLEAN + MODERN */}
            <Menubar className="rounded-md border bg-muted">
                <MenubarMenu>
                    <MenubarTrigger>
                        <Bold className={editor.isActive("bold") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleBold().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger>
                        <Italic className={editor.isActive("italic") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleItalic().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger>
                        <UnderlineIcon className={editor.isActive("underline") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleUnderline().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger>
                        <Strikethrough className={editor.isActive("strike") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleStrike().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1" />

                <MenubarMenu>
                    <MenubarTrigger>
                        <List className={editor.isActive("bulletList") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleBulletList().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger>
                        <ListOrdered className={editor.isActive("orderedList") ? "text-primary" : ""} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1" />

                <MenubarMenu>
                    <MenubarTrigger
                        onClick={() => {
                            const url = prompt("Enter URL");
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }}
                    >
                        <Link2 className={editor.isActive("link") ? "text-primary" : ""} />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger onClick={() => editor.chain().focus().unsetLink().run()}>
                        <Unlink />
                    </MenubarTrigger>
                </MenubarMenu>

                <Separator orientation="vertical" className="mx-1" />

                {/* <MenubarMenu>
                    <MenubarTrigger
                        onClick={() => {
                            const url = prompt("Image URL?");
                            if (url) editor.chain().focus().setImage({ src: url }).run();
                        }}
                    >
                        <ImageIcon />
                    </MenubarTrigger>
                </MenubarMenu> */}

                <Separator orientation="vertical" className="mx-1" />

                <MenubarMenu>
                    <MenubarTrigger onClick={() => editor.chain().focus().undo().run()}>
                        <Undo />
                    </MenubarTrigger>
                </MenubarMenu>

                <MenubarMenu>
                    <MenubarTrigger onClick={() => editor.chain().focus().redo().run()}>
                        <Redo />
                    </MenubarTrigger>
                </MenubarMenu>
            </Menubar>

            {/* EDITOR */}
            <div className="border rounded-md p-3 bg-card min-h-[250px]">
                <EditorContent editor={editor} className="tiptap" />
            </div>
        </div>
    );
}
