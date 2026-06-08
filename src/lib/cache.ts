// Next 16's revalidateTag takes a cache profile as its second argument; "max"
// fully invalidates every entry carrying the tag (vs a softer background
// revalidate). Shared by every server action that flushes a cache tag.
export const REVALIDATE_PROFILE = "max";
