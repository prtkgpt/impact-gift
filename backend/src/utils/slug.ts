export const generateSlug = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${slug}-${randomSuffix}`;
};
