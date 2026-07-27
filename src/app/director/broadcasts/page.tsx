import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { MessagePriority } from "@prisma/client";
import { publishBroadcast } from "@/lib/actions/broadcasts";
import { mockBroadcasts } from "@/lib/mock-data";

export default async function BroadcastsPage() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  let messages = await db.broadcastMessages.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  if (messages.length === 0) {
    messages = mockBroadcasts as any;
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold">Global Broadcasts</h1>
        <p className="text-slate-500">Publish priority notices to all active dispatch and crew screens.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">New Broadcast</h2>
        <form action={async (formData: FormData) => {
          'use server';
          const content = formData.get('content') as string;
          const priority = formData.get('priority') as MessagePriority;
          const hours = parseInt(formData.get('expiresIn') as string);
          
          let expiresAt: Date | undefined = undefined;
          if (hours) {
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + hours);
          }

          await publishBroadcast(content, priority, expiresAt);
        }} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Message</label>
            <textarea 
              name="content" 
              required 
              rows={3} 
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent text-slate-900 dark:text-white"
              placeholder="e.g., Runway 2 Left Closed for De-icing..."
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Priority</label>
              <select name="priority" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Expires In (Hours)</label>
              <input type="number" name="expiresIn" min="1" max="72" placeholder="Leave empty for no expiry" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white" />
            </div>
          </div>
          <button type="submit" className="self-end px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">
            Publish Broadcast
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Broadcast History</h2>
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className="p-4 border rounded-lg flex justify-between items-start">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    msg.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    msg.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {msg.priority}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{msg.createdAt.toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200">{msg.content}</p>
              </div>
              {msg.expiresAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Expires: {msg.expiresAt.toLocaleString()}
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No broadcasts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
