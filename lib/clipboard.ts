import { toast } from "sonner";

/** Copy text and say so; one place for every "copy" button. */
export async function copyText(text: string, what = "Copied"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what);
  } catch {
    toast.error("Could not copy");
  }
}
