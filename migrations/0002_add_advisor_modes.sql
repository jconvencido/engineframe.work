-- Add all 20 advisor modes
insert into public.advisor_modes (slug, name, description)
values
  ('sales', 'Sales', 'Strategies for boosting sales performance'),
  ('marketing', 'Marketing', 'Insights to increase marketing impact'),
  ('startup', 'Startup', 'Guidance on launching new ventures'),
  ('enterprise', 'Enterprise', 'Solutions for scaling and optimization'),
  ('finance', 'Finance', 'Financial planning and management advice'),
  ('operations', 'Operations', 'Optimize workflows and processes'),
  ('hr', 'Human Resources', 'Talent management and team building'),
  ('product', 'Product Strategy', 'Product development and roadmap planning'),
  ('customer-success', 'Customer Success', 'Improve customer retention and satisfaction'),
  ('growth', 'Growth Strategy', 'Scaling and expansion strategies'),
  ('branding', 'Branding', 'Build and strengthen your brand identity'),
  ('ecommerce', 'E-Commerce', 'Online retail optimization strategies'),
  ('saas', 'SaaS', 'Software as a Service business models'),
  ('fundraising', 'Fundraising', 'Investment and funding strategies'),
  ('legal', 'Legal & Compliance', 'Business law and regulatory guidance'),
  ('technology', 'Technology', 'Tech stack and digital transformation'),
  ('analytics', 'Analytics', 'Data-driven decision making'),
  ('partnerships', 'Partnerships', 'Strategic alliances and collaborations'),
  ('international', 'International Expansion', 'Global market entry strategies'),
  ('sustainability', 'Sustainability', 'ESG and sustainable business practices')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;
