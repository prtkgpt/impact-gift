-- Add category field to potluck items for meal planning

ALTER TABLE potluck_items
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add index for filtering by category
CREATE INDEX IF NOT EXISTS idx_potluck_items_category ON potluck_items(category);

-- Add comment
COMMENT ON COLUMN potluck_items.category IS 'Category of potluck item (e.g., Appetizer, Main Course, Dessert, Beverage, etc.)';
