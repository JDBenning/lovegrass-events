import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { data, email, action } = req.query;

  // Load itinerary by email
  if (action === 'get' && email) {
    try {
      const saved = await kv.get(`itinerary:${email.toLowerCase().trim()}`);
      if (!saved) {
        return res.send(`
          <h2 style="text-align:center;padding:80px;font-family:sans-serif;">
            No itinerary found for ${email}.<br><br>
            Go back and add some events first!
          </h2>
        `);
      }
      return renderItinerary(res, saved);
    } catch (e) {
      return res.status(500).send(`<h2 style="text-align:center;padding:60px;">Error loading itinerary</h2>`);
    }
  }

  // Save from magic link
  if (data && email) {
    try {
      const events = JSON.parse(atob(data));
      await kv.set(`itinerary:${email.toLowerCase().trim()}`, events, { ex: 60*60*24*30 }); // 30 days
      return renderItinerary(res, events);
    } catch (e) {
      return res.status(400).send(`<h1>Invalid data</h1>`);
    }
  }

  // Show email form
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Lovegrass Itinerary</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#fff8d7; color:#172856; max-width:720px; margin:40px auto; padding:20px; text-align:center; }
    input, button { padding:16px 20px; font-size:17px; border-radius:999px; border:2px solid #172856; width:100%; max-width:420px; margin:10px auto; display:block; }
    button { background:#172856; color:white; cursor:pointer; }
  </style>
</head>
<body>
  <h1>🎸 My Lovegrass Itinerary</h1>
  <p>Enter your email to save or load your festival plan</p>
  
  <form method="get">
    <input type="email" name="email" placeholder="your@email.com" required />
    <input type="hidden" name="action" value="get" />
    <button type="submit">Load / Save My Itinerary</button>
  </form>

  <p style="color:#666; margin-top:40px;">We'll add you to our festival email list.</p>
</body>
</html>`);
}

function renderItinerary(res, events) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Lovegrass Itinerary</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#fff8d7; color:#172856; max-width:800px; margin:40px auto; padding:20px; }
    h1 { text-align:center; }
    .event { background:white; border-radius:16px; padding:20px; margin:16px 0; box-shadow:0 4px 20px rgba(0,0,0,.08); }
    .time { font-weight:900; color:#e74c3c; }
    button { background:#172856; color:white; border:none; padding:12px 24px; border-radius:999px; cursor:pointer; margin:10px; }
  </style>
</head>
<body>
  <h1>🎸 My Lovegrass Itinerary (${events.length} events)</h1>
  ${events.map(ev => `
    <div class="event">
      <div class="time">${new Date(ev.start).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})} 
      • ${new Date(ev.start).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'})}</div>
      <h2>${ev.title}</h2>
      <div><strong>Where:</strong> ${ev.location || 'TBD'}</div>
      ${ev.category ? `<div><strong>Category:</strong> ${ev.category}</div>` : ''}
    </div>
  `).join('')}

  <div style="text-align:center;margin:40px 0;">
    <button onclick="window.print()">🖨️ Print Itinerary</button>
    <button onclick="navigator.share && navigator.share({title:'My Lovegrass Itinerary', url:window.location.href})">🔗 Share Page</button>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
