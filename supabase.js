/**
 * Radio Online - Supabase Configuration
 * Real-time chat integration
 */

const SUPABASE_URL = 'https://navkidqpyvynrvyzqhkv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdmtpZHFweXZ5bnJ2eXpxaGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDU1NjAsImV4cCI6MjA4NDY4MTU2MH0.fCDDnAtkijzBJT6WOaWtHMfId-Qs7Z2CdbbkgC4pFxE';

// Supabase client for web
class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.key = SUPABASE_ANON_KEY;
        this.headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        this.realtimeChannel = null;
        this.accessToken = null;
    }

    // Fetch last 50 messages
    async getMessages() {
        try {
            const response = await fetch(
                `${this.url}/rest/v1/messages?select=*&order=created_at.asc&limit=50`,
                { headers: this.headers }
            );
            if (!response.ok) throw new Error('Failed to fetch messages');
            return await response.json();
        } catch (error) {
            console.error('Error fetching messages:', error);
            return null;
        }
    }

    // Send a new message
    async sendMessage(nickname, content) {
        try {
            const body = {
                nickname: nickname,
                content: content,
                user_id: this.accessToken ? null : null // Anonymous for now
            };

            const response = await fetch(
                `${this.url}/rest/v1/messages`,
                {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send message');
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            return null;
        }
    }

    // Sign in anonymously
    async signInAnonymously() {
        try {
            const response = await fetch(
                `${this.url}/auth/v1/signup`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': this.key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access_token;
                return data;
            }
        } catch (error) {
            console.error('Error signing in:', error);
        }
        return null;
    }

    // Subscribe to realtime messages
    subscribeToMessages(onMessage) {
        // Create WebSocket connection for Realtime
        const realtimeUrl = this.url.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + this.key + '&vsn=1.0.0';

        try {
            const ws = new WebSocket(realtimeUrl);

            ws.onopen = () => {
                console.log('Realtime connected');

                // Send join message
                const joinMsg = {
                    topic: 'realtime:public:messages',
                    event: 'phx_join',
                    payload: {
                        config: {
                            postgres_changes: [{
                                event: 'INSERT',
                                schema: 'public',
                                table: 'messages'
                            }]
                        }
                    },
                    ref: '1'
                };
                ws.send(JSON.stringify(joinMsg));

                // Heartbeat
                setInterval(() => {
                    ws.send(JSON.stringify({
                        topic: 'phoenix',
                        event: 'heartbeat',
                        payload: {},
                        ref: '0'
                    }));
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'postgres_changes' && msg.payload?.data?.record) {
                        onMessage(msg.payload.data.record);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            };

            ws.onerror = (error) => {
                console.error('Realtime error:', error);
            };

            this.realtimeChannel = ws;
        } catch (error) {
            console.error('Failed to connect to Realtime:', error);
        }
    }

    // Unsubscribe from realtime
    unsubscribe() {
        if (this.realtimeChannel) {
            this.realtimeChannel.close();
            this.realtimeChannel = null;
        }
    }
}

// Export singleton
const supabase = new SupabaseClient();
