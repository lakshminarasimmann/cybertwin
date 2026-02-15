/**
 * Supabase Client Configuration
 * 
 * Provides database connectivity for:
 * - User identity management
 * - Behavioral baseline storage
 * - Session behavior time-series
 * - Risk event logging
 * 
 * Privacy note: Only aggregated metrics stored, never raw content.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ─── In-Memory Fallback Store ───────────────────────────────────────────────
// When Supabase is not configured, use in-memory storage for demo purposes
const inMemoryStore = {
    users: new Map(),
    behavior_baseline: new Map(),
    session_behavior: [],
    risk_events: [],
    sessions: new Map()
};

// Initialize demo user
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DEMO_USER_ID = 'demo-user-001';
const DEMO_SESSION_ID = 'demo-session-001';

// Initialize demo data
(async () => {
    const hashedPassword = await bcrypt.hash('demo123', 10);
    inMemoryStore.users.set(DEMO_USER_ID, {
        id: DEMO_USER_ID,
        email: 'analyst@cybertwin.io',
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        name: 'Security Analyst'
    });

    inMemoryStore.behavior_baseline.set(DEMO_USER_ID, {
        id: uuidv4(),
        user_id: DEMO_USER_ID,
        avg_typing_speed: 220,
        avg_click_interval: 450,
        avg_mouse_speed: 2.1,
        avg_read_time: 3500,
        avg_navigation_entropy: 0.35,
        login_time_pattern: { preferred_hours: [9, 10, 11, 14, 15, 16], timezone: 'UTC' },
        session_count: 50,
        updated_at: new Date().toISOString()
    });
})();

/**
 * Check if Supabase is properly configured
 */
const isSupabaseConfigured = () => {
    return supabaseUrl !== 'https://placeholder.supabase.co' &&
        supabaseServiceKey !== 'placeholder-key';
};

/**
 * Database abstraction layer — works with Supabase or in-memory fallback
 */
const db = {
    // ─── Users ──────────────────────────────────────────────────────────────
    async getUser(email) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error) return null;
            return data;
        }
        // In-memory fallback
        for (const [, user] of inMemoryStore.users) {
            if (user.email === email) return user;
        }
        return null;
    },

    async getUserById(id) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            if (error) return null;
            return data;
        }
        return inMemoryStore.users.get(id) || null;
    },

    async createUser(user) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('users')
                .insert(user)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        inMemoryStore.users.set(user.id, user);
        return user;
    },

    // ─── Behavior Baseline (Digital Twin) ───────────────────────────────────
    async getBaseline(userId) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('behavior_baseline')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error) return null;
            return data;
        }
        return inMemoryStore.behavior_baseline.get(userId) || null;
    },

    async upsertBaseline(baseline) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('behavior_baseline')
                .upsert(baseline, { onConflict: 'user_id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        inMemoryStore.behavior_baseline.set(baseline.user_id, {
            ...baseline,
            updated_at: new Date().toISOString()
        });
        return baseline;
    },

    // ─── Session Behavior (Time Series) ─────────────────────────────────────
    async insertSessionBehavior(behavior) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('session_behavior')
                .insert(behavior)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        const entry = { ...behavior, id: uuidv4(), timestamp: new Date().toISOString() };
        inMemoryStore.session_behavior.push(entry);
        // Keep only last 1000 entries to prevent memory leak
        if (inMemoryStore.session_behavior.length > 1000) {
            inMemoryStore.session_behavior = inMemoryStore.session_behavior.slice(-500);
        }
        return entry;
    },

    async getSessionBehavior(userId, limit = 50) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('session_behavior')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(limit);
            if (error) return [];
            return data;
        }
        return inMemoryStore.session_behavior
            .filter(b => b.user_id === userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    },

    async getRecentBehavior(userId, windowMinutes = 30) {
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('session_behavior')
                .select('*')
                .eq('user_id', userId)
                .gte('timestamp', cutoff)
                .order('timestamp', { ascending: true });
            if (error) return [];
            return data;
        }
        return inMemoryStore.session_behavior
            .filter(b => b.user_id === userId && b.timestamp >= cutoff)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // ─── Risk Events ───────────────────────────────────────────────────────
    async insertRiskEvent(event) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('risk_events')
                .insert(event)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
        const entry = { ...event, id: uuidv4(), created_at: new Date().toISOString() };
        inMemoryStore.risk_events.push(entry);
        if (inMemoryStore.risk_events.length > 500) {
            inMemoryStore.risk_events = inMemoryStore.risk_events.slice(-250);
        }
        return entry;
    },

    async getRiskEvents(sessionId, limit = 20) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('risk_events')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) return [];
            return data;
        }
        return inMemoryStore.risk_events
            .filter(e => !sessionId || e.session_id === sessionId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    },

    async getAllRiskEvents(limit = 50) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('risk_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) return [];
            return data;
        }
        return inMemoryStore.risk_events
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    },

    // ─── Raw store access for demo ──────────────────────────────────────────
    getStore() {
        return inMemoryStore;
    }
};

module.exports = { supabase, db, inMemoryStore, isSupabaseConfigured };
