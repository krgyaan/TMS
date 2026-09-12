import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, ImagePlus, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { fileUploadService } from "@/services/api/file-upload.service";
import { authKeys } from "@/hooks/api/useAuth";
import { useProfileContext } from "../contexts/ProfileContext";
import { getInitials } from "../utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (matches backend "profile-photos" context)

interface ProfilePhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfilePhotoDialog: React.FC<ProfilePhotoDialogProps> = ({ open, onOpenChange }) => {
  const { data, refetch } = useProfileContext();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const CURRENT_USER = data?.currentUser;
  const fullName =
    [data?.profile?.firstName, data?.profile?.middleName, data?.profile?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || CURRENT_USER?.name || "Employee";
  const initials = getInitials(fullName);
  const currentPhoto = data?.profile?.profilePhoto || null;

  // Local preview cleanup
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset state when the dialog closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const ext = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_TYPES.includes(selected.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      setError("Only JPG, PNG or WebP images are allowed.");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError("Image must be 5MB or smaller.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !CURRENT_USER) return;
    setError(null);
    setUploading(true);
    try {
      const result = await fileUploadService.upload([file], "profile-photos");
      const uploaded = result.files[0];
      if (!uploaded) {
        const detail = result.errors[0]?.error || "Upload failed";
        throw new Error(detail);
      }
      const image = `/uploads/hrms/profile-photos/${uploaded.fileName}`;
      await api.post(`/user-profiles/${CURRENT_USER.id}/avatar`, { image });
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
      refetch();
      toast.success("Profile photo updated");
      onOpenChange(false);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to update profile photo");
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const displayPhoto = previewUrl || currentPhoto || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Profile Photo</DialogTitle>
          </div>
          <DialogDescription>
            Upload a new photo (JPG, PNG or WebP, up to 5MB). It will replace the current one across the app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={fullName}
                  className="h-32 w-32 rounded-2xl border-4 border-background object-cover shadow-lg shadow-black/10"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-primary/10 to-primary/25 shadow-lg shadow-black/10">
                  <span className="text-3xl font-black text-primary">{initials}</span>
                </div>
              )}
              {file && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary shadow-md">
                  <ImagePlus className="h-3 w-3 text-primary-foreground" />
                </span>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-semibold"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                {file ? "Choose another" : currentPhoto ? "Replace photo" : "Choose photo"}
              </Button>
            </div>
            {file && (
              <p className="max-w-[280px] truncate text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground/80">{file.name}</span>
              </p>
            )}
            {!file && !currentPhoto && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
                No photo uploaded yet — initials are shown instead.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Photo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
