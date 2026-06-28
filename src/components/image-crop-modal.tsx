import { useState, useRef } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspect?: number;
  onCropComplete: (base64: string) => void | Promise<void>;
  title?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  aspect,
  onCropComplete,
  title = "Crop Image",
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [applying, setApplying] = useState(false);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const effectiveAspect = aspect ?? 1;
    setCrop(centerAspectCrop(width, height, effectiveAspect));
  }

  async function applyCrop() {
    if (!completedCrop || !imgRef.current) return;
    setApplying(true);
    try {
      const image = imgRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(completedCrop.width * scaleX);
      canvas.height = Math.round(completedCrop.height * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const base64 = dataUrl.split(",")[1] ?? "";
      await onCropComplete(base64);
      onClose();
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !applying) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center overflow-auto max-h-[60vh] rounded-lg">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
            minHeight={50}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              style={{ maxWidth: "100%", maxHeight: "55vh", display: "block" }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Drag to adjust the crop area, then click Apply.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={applyCrop} disabled={applying || !completedCrop}>
            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
