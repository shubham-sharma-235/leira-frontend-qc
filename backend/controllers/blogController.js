const Blog = require('../models/Blog');
const BlogReaction = require('../models/BlogReaction');
const mongoose = require('mongoose');

const toSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

async function ensureUniqueBlogSlug(baseValue, excludeId = null) {
  const base = toSlug(baseValue || 'blog-post') || 'blog-post';
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await Blog.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .select('_id')
      .lean();
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

function parseSecondaryKeywords(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeBlocks(input) {
  if (!Array.isArray(input)) return undefined;
  const allowed = new Set(['richText', 'image', 'imageLeft', 'imageRight', 'callout']);
  const blocks = input
    .map((b, idx) => {
      const type = allowed.has(String(b?.type)) ? String(b.type) : 'richText';
      const html = String(b?.html || '');
      const imageUrl = String(b?.imageUrl || '').trim();
      const alt = String(b?.alt || '').trim();
      const caption = String(b?.caption || '').trim();
      const toneRaw = String(b?.tone || 'neutral');
      const tone = ['neutral', 'pink', 'green'].includes(toneRaw) ? toneRaw : 'neutral';
      const order = Number.isFinite(Number(b?.order)) ? Number(b.order) : idx;
      return { type, html, imageUrl, alt, caption, tone, order };
    })
    .filter((b) => {
      if (b.type === 'image' || b.type === 'imageLeft' || b.type === 'imageRight') return !!b.imageUrl;
      return !!b.html;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return blocks.length ? blocks : undefined;
}

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message,
    });
  }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlog = async (req, res) => {
  try {
    const identifier = String(req.params.id || '').trim();
    let blog = null;

    if (identifier.match(/^[a-f\d]{24}$/i)) {
      blog = await Blog.findById(identifier);
    }
    if (!blog) {
      blog = await Blog.findOne({ slug: identifier });
    }
    if (!blog && identifier) {
      const candidates = await Blog.find({}, '_id slug title').lean();
      const match = candidates.find((item) => toSlug(item.slug || item.title || '') === identifier);
      if (match?._id) {
        blog = await Blog.findById(match._id);
        // Backfill slug for old posts so future lookups are direct and fast.
        if (blog && !blog.slug) {
          blog.slug = await ensureUniqueBlogSlug(blog.title || identifier, blog._id);
          await blog.save();
        }
      }
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message,
    });
  }
};

// @desc    Get current user's reaction for a blog
// @route   GET /api/blogs/:id/reaction
// @access  Private/User
exports.getMyReaction = async (req, res) => {
  try {
    const blogId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    const reaction = await BlogReaction.findOne({ blog: blogId, user: req.user._id }).lean();
    return res.status(200).json({
      success: true,
      data: { reaction: reaction?.type || null },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching reaction',
      error: error.message,
    });
  }
};

// @desc    Record a view (increment views count)
// @route   POST /api/blogs/:id/view
// @access  Public
exports.recordView = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }
    res.status(200).json({
      success: true,
      data: { views: blog.views },
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error recording view',
      error: error.message,
    });
  }
};

// @desc    Like or dislike a blog
// @route   POST /api/blogs/:id/react
// @access  Public
exports.reactToBlog = async (req, res) => {
  try {
    const { type } = req.body; // 'like' | 'dislike'
    if (!type || !['like', 'dislike'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction type. Use "like" or "dislike".',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }

    const userId = req.user._id;
    const existing = await BlogReaction.findOne({ blog: blog._id, user: userId });

    // Anti-spam: do not allow rapid toggling/submitting repeatedly.
    if (existing) {
      const elapsedMs = Date.now() - new Date(existing.updatedAt).getTime();
      if (elapsedMs < 5000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait a few seconds before reacting again.',
        });
      }
    }

    if (!existing) {
      await BlogReaction.create({ blog: blog._id, user: userId, type });
      if (type === 'like') blog.likes += 1;
      if (type === 'dislike') blog.dislikes += 1;
      await blog.save();
    } else if (existing.type === type) {
      // Same reaction again: keep counts unchanged but return current state.
      return res.status(200).json({
        success: true,
        data: { likes: blog.likes, dislikes: blog.dislikes, reaction: existing.type },
      });
    } else {
      // Toggle reaction from like <-> dislike
      if (existing.type === 'like') {
        blog.likes = Math.max(0, Number(blog.likes || 0) - 1);
        blog.dislikes += 1;
      } else {
        blog.dislikes = Math.max(0, Number(blog.dislikes || 0) - 1);
        blog.likes += 1;
      }
      existing.type = type;
      await existing.save();
      await blog.save();
    }

    res.status(200).json({
      success: true,
      data: { likes: blog.likes, dislikes: blog.dislikes, reaction: type },
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error recording reaction',
      error: error.message,
    });
  }
};

// @desc    Create a blog post
// @route   POST /api/blogs
// @access  Private/Admin
exports.createBlog = async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };

    if (!payload.title || !payload.excerpt || !payload.category || !payload.date || !payload.readTime || !payload.imageUrl || !payload.author) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Slug handling
    const requestedSlug = String(payload.slug || '').trim();
    payload.slug = await ensureUniqueBlogSlug(requestedSlug || payload.title);

    // Blocks & SEO
    const blocks = normalizeBlocks(payload.blocks);
    if (blocks) payload.blocks = blocks;
    const secondaryKeywords = parseSecondaryKeywords(payload?.seo?.secondaryKeywords ?? payload.secondaryKeywords);
    payload.seo = {
      metaTitle: String(payload?.seo?.metaTitle ?? payload.metaTitle ?? '').trim(),
      metaDescription: String(payload?.seo?.metaDescription ?? payload.metaDescription ?? '').trim(),
      primaryKeyword: String(payload?.seo?.primaryKeyword ?? payload.primaryKeyword ?? '').trim(),
      secondaryKeywords,
    };

    const blog = await Blog.create(payload);
    return res.status(201).json({ success: true, data: blog });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating blog post',
      error: error.message,
    });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
exports.updateBlog = async (req, res) => {
  try {
    const id = req.params.id;
    let blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }

    const payload = { ...(req.body || {}) };

    // slug: allow updating, but ensure uniqueness
    if (payload.slug != null) {
      const requestedSlug = String(payload.slug || '').trim();
      blog.slug = requestedSlug ? await ensureUniqueBlogSlug(requestedSlug, blog._id) : blog.slug;
    } else if (!blog.slug) {
      blog.slug = await ensureUniqueBlogSlug(blog.title || 'blog-post', blog._id);
    }

    const updatable = [
      'title',
      'subHeading',
      'excerpt',
      'content',
      'category',
      'date',
      'readTime',
      'imageUrl',
      'coverImageMobile',
      'author',
    ];
    for (const key of updatable) {
      if (payload[key] != null) blog[key] = payload[key];
    }

    const blocks = normalizeBlocks(payload.blocks);
    if (payload.blocks != null) {
      blog.blocks = blocks;
    }

    const secondaryKeywords = parseSecondaryKeywords(payload?.seo?.secondaryKeywords ?? payload.secondaryKeywords);
    const seoPatch =
      payload.seo != null ||
      payload.metaTitle != null ||
      payload.metaDescription != null ||
      payload.primaryKeyword != null ||
      payload.secondaryKeywords != null;
    if (seoPatch) {
      blog.seo = {
        metaTitle: String(payload?.seo?.metaTitle ?? payload.metaTitle ?? blog?.seo?.metaTitle ?? '').trim(),
        metaDescription: String(payload?.seo?.metaDescription ?? payload.metaDescription ?? blog?.seo?.metaDescription ?? '').trim(),
        primaryKeyword: String(payload?.seo?.primaryKeyword ?? payload.primaryKeyword ?? blog?.seo?.primaryKeyword ?? '').trim(),
        secondaryKeywords: secondaryKeywords.length ? secondaryKeywords : blog?.seo?.secondaryKeywords || [],
      };
    }

    await blog.save();
    return res.status(200).json({ success: true, data: blog });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating blog post',
      error: error.message,
    });
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
    await Blog.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting blog post',
      error: error.message,
    });
  }
};

// (removed duplicate admin CRUD handlers)
