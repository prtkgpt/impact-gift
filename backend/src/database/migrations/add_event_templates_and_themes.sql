-- Event Templates and Themes Migration
-- Adds support for pre-configured event templates and customizable themes

-- 1. Create event_templates table
CREATE TABLE IF NOT EXISTS event_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    default_title_template VARCHAR(255), -- e.g., "{name}'s Birthday Celebration"
    default_description_template TEXT,
    suggested_charities TEXT[], -- Array of charity categories
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create event_themes table
CREATE TABLE IF NOT EXISTS event_themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_color VARCHAR(7) NOT NULL, -- Hex color
    secondary_color VARCHAR(7) NOT NULL,
    accent_color VARCHAR(7) NOT NULL,
    background_gradient_start VARCHAR(7),
    background_gradient_end VARCHAR(7),
    button_style VARCHAR(50) DEFAULT 'rounded', -- rounded, square, pill
    font_family VARCHAR(100) DEFAULT 'system',
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    preview_image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add theme_id and template_id to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES event_themes(id),
ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES event_templates(id),
ADD COLUMN IF NOT EXISTS custom_colors JSONB; -- For users who want custom colors

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_event_templates_event_type ON event_templates(event_type);
CREATE INDEX IF NOT EXISTS idx_event_templates_is_active ON event_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_event_themes_is_active ON event_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_events_theme_id ON events(theme_id);
CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id);

-- 5. Insert default event templates
INSERT INTO event_templates (name, display_name, description, event_type, icon, default_title_template, default_description_template, suggested_charities, sort_order) VALUES
('birthday-celebration', 'Birthday Celebration', 'A joyful birthday celebration where gifts become meaningful donations', 'birthday', '🎂', '{name}''s Birthday Celebration', 'Help me celebrate my birthday by making a difference! Instead of gifts, I''d love for you to donate to these amazing causes.', ARRAY['Children', 'Education', 'Healthcare'], 1),
('wedding-registry', 'Wedding Registry Alternative', 'Replace traditional registry with charitable donations', 'wedding', '💒', '{name1} & {name2}''s Wedding', 'In lieu of traditional gifts, we ask that you consider donating to one of these charities that are close to our hearts.', ARRAY['Environment', 'Children', 'Healthcare'], 2),
('memorial-tribute', 'Memorial Tribute', 'Honor a loved one with charitable giving', 'memorial', '🕊️', 'In Memory of {name}', 'In loving memory of {name}, we invite you to donate to causes that were dear to their heart.', ARRAY['Healthcare', 'Research', 'Education'], 3),
('graduation-gift', 'Graduation Celebration', 'Celebrate academic achievement with meaningful impact', 'graduation', '🎓', '{name}''s Graduation Celebration', 'As I begin this new chapter, please help me give back by donating to these important causes.', ARRAY['Education', 'Youth', 'Scholarship'], 4),
('anniversary-giving', 'Anniversary Celebration', 'Mark your special day with charitable giving', 'anniversary', '💝', '{name1} & {name2}''s Anniversary', 'Celebrating {years} years together! Please join us in supporting these meaningful causes.', ARRAY['Environment', 'Healthcare', 'Arts'], 5),
('baby-shower', 'Baby Shower', 'Welcome a new life with giving', 'baby-shower', '👶', '{name}''s Baby Shower', 'As we prepare to welcome our little one, we invite you to donate to causes that help children and families.', ARRAY['Children', 'Healthcare', 'Family Services'], 6),
('retirement-party', 'Retirement Celebration', 'Celebrate a career milestone with impact', 'retirement', '🎉', '{name}''s Retirement Celebration', 'As I embark on this new journey, please help me give back to the community through these wonderful organizations.', ARRAY['Education', 'Healthcare', 'Arts'], 7),
('general-fundraiser', 'General Fundraiser', 'A flexible template for any occasion', 'other', '❤️', 'Support Our Cause', 'Join us in making a difference by supporting these important causes.', ARRAY[], 8)
ON CONFLICT (name) DO NOTHING;

-- 6. Insert default event themes
INSERT INTO event_themes (name, display_name, description, primary_color, secondary_color, accent_color, background_gradient_start, background_gradient_end, button_style, font_family, sort_order) VALUES
('elegant-blue', 'Elegant Blue', 'Professional and calming blue tones', '#1e40af', '#3b82f6', '#60a5fa', '#dbeafe', '#eff6ff', 'rounded', 'system', 1),
('warm-sunset', 'Warm Sunset', 'Vibrant orange and pink gradients', '#f59e0b', '#ec4899', '#fbbf24', '#fef3c7', '#fce7f3', 'rounded', 'system', 2),
('forest-green', 'Forest Green', 'Natural and earthy green palette', '#059669', '#10b981', '#34d399', '#d1fae5', '#ecfdf5', 'rounded', 'system', 3),
('royal-purple', 'Royal Purple', 'Rich and sophisticated purple tones', '#7c3aed', '#a78bfa', '#c4b5fd', '#ede9fe', '#f5f3ff', 'rounded', 'system', 4),
('rose-gold', 'Rose Gold', 'Elegant rose and gold combination', '#f43f5e', '#fb7185', '#fda4af', '#ffe4e6', '#fff1f2', 'rounded', 'system', 5),
('ocean-breeze', 'Ocean Breeze', 'Cool turquoise and teal colors', '#0891b2', '#06b6d4', '#22d3ee', '#cffafe', '#ecfeff', 'rounded', 'system', 6),
('midnight-dark', 'Midnight Dark', 'Sleek dark mode design', '#1f2937', '#374151', '#6b7280', '#111827', '#1f2937', 'rounded', 'system', 7),
('minimalist-mono', 'Minimalist Mono', 'Clean black and white aesthetic', '#000000', '#374151', '#6b7280', '#f9fafb', '#ffffff', 'square', 'system', 8)
ON CONFLICT (name) DO NOTHING;
