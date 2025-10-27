import { SessionsClient } from '@google-cloud/dialogflow-cx';

const client = new SessionsClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const wss = new WebSocket.Server({ noServer: true });

  req.socket.server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('Retell connected via WebSocket');

      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data);
          const transcript = msg.transcript || '';
          const sessionId = msg.sessionId || 'default';

          if (!transcript) return;

          const sessionPath = client.projectLocationAgentSessionPath(
            process.env.GCP_PROJECT_ID,
            'global',
            process.env.DIALOGFLOW_AGENT_ID,
            sessionId
          );

          const [response] = await client.detectIntent({
            session: sessionPath,
            queryInput: { text: { text: transcript } },
          });

          const reply = response.queryResult.fulfillmentText || "Got it!";

          ws.send(JSON.stringify({ response: reply }));
        } catch (err) {
          console.error(err);
          ws.send(JSON.stringify({ response: "Sorry, something went wrong." }));
        }
      });

      ws.on('close', () => console.log('Retell disconnected'));
    });
  });

  res.end();
}
