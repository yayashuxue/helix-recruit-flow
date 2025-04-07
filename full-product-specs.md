# Helix: The Agentic Recruiter

# 💡 Pre-Mission Brief

---

The HR department noticed sales using Selix, and they got jealous!

After noticing this, you take it upon yourself to create a new product line… in **3** days 🤯.

The purpose of the agent is to help do outreach to find the best talent.

As an [**AI Engineer**](https://www.sellscale.com/blog-posts/the-rise-of-the-ai-engineer), you will be building this agent to help redefine the future of work, for yet another corner of the office!

Onto the challenge.

# 🧘 Purpose

---

The purpose of this section tests a few things:

- Where your quality bar is for shipping product
- How well you can ship on an open-ended problem space
- How well you empathize with user (AKA the recruiter. There are many items not covered in this assignment you may want to think about)
- Familiarity with agentic product design, or ability to learn it (this is an Agentic-first AI product, not SaaS 1.0. There will be different design choices - eg chat based interface)
- Backend and agentic architecture

# 🚀 Challenge: Recruiting Outreach

---

**We are building a fictional prototype of the SellScale HR** (not sales) **Agent called Helix.** Essentially think you are building this for a recruiter of a fast growing company. They don’t have much time to write out commas and sentences for outreach, but they have a great idea of how they’re recruiting for. You want the agent to do the work for them - collect input where useful, but have the agent do the rest - use the human for review.

This app will include a chat-driven interface for collecting user input and a dynamic workspace for displaying and editing a recruiting outreach sequences.

**The app should include the following functionality:**

1. **Chat Bar (Left Side):** A conversational interface where users can input ideas and preferences about their recruiting outreach. The AI will guide users with prompts and collect information.
2. **Dynamic Workspace (Right Side):** A workspace with individual artifacts for each sequence step. Users can directly edit the content, and the AI will respond to edits dynamically.
    1. **Live Updates:** The AI dynamically updates the recruiting sequence in real-time as the user interacts with the chat or the workspace.

![image.png](Helix%20The%20Agentic%20Recruiter%201cededbd3bf08022a50efb75ac03f226/image.png)

**Core Deliverables:**

1. A React-based frontend application with a chat bar and workspace layout (uses Typescript)
2. A Flask backend with endpoints for processing chat inputs, generating sequences, and handling live updates.
3. A relational database (eg., PostgreSQL) to store user preferences and generated sequences.
4. Agentic infrastructure - Feel free to use OpenAI Assistants, Langchain, or any agentic infrastructure (with LLM based chat and Function calling)

# **👤Example user workflow**

---

1. User chat’s with the AI, back and forth, about their campaign idea.
    
    ![image.png](Helix%20The%20Agentic%20Recruiter%201cededbd3bf08022a50efb75ac03f226/image%201.png)
    
2. After the AI has enough information, it’ll generate a simple sequence (dynamically on the right).
    
    ![image.png](Helix%20The%20Agentic%20Recruiter%201cededbd3bf08022a50efb75ac03f226/image%202.png)
    
3. After the sequence is generated, the user can give ‘edits’ to the AI directly (and/or change the sequence manually on the right) and can work with the AI to make live adjustments.
    
    ![image.png](Helix%20The%20Agentic%20Recruiter%201cededbd3bf08022a50efb75ac03f226/image%203.png)
    

# 🥽 Resources

---

Use these resources as starting points to complete the challenge. Feel free to explore additional tools and libraries.

- **Frontend:**
    - React Documentation: [https://reactjs.org/docs/getting-started.html](https://reactjs.org/docs/getting-started.html)
    - Create React App: [https://create-react-app.dev/](https://create-react-app.dev/)
    - Dribbble for UI Inspiration: [https://dribbble.com](https://dribbble.com/)
    - Sockets (for dynamic UI updating from backend): https://socket.io/how-to/use-with-react
- **Backend:**
    - Flask Documentation: [https://flask.palletsprojects.com/en/2.2.x/](https://flask.palletsprojects.com/en/2.2.x/)
- **Database:**
    - Relational
        - PostgreSQL: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
        - SQLite: [https://sqlitebrowser.org/](https://sqlitebrowser.org/)
    - Vector
        - Pinecone: https://www.pinecone.io/?utm_term=pinecone%20database&utm_campaign=brand-us-e&utm_source=adwords&utm_medium=ppc&hsa_acc=3111363649&hsa_cam=21023369441&hsa_grp=167470667468&hsa_ad=690982708943&hsa_src=g&hsa_tgt=kwd-1627713670725&hsa_kw=pinecone%20database&hsa_mt=e&hsa_net=adwords&hsa_ver=3&gad_source=1&gclid=Cj0KCQiAkJO8BhCGARIsAMkswyh3xTPWddfipP_I57j6CHFBWRqvWZj1vOoL2DdEW5becfLAhxNQcg8aAqhxEALw_wcB
        - Chroma: https://www.trychroma.com/
- **Agentic Infrastructure**
    - SellScale: https://www.sellscale.com/blog-posts/the-magic-of-agentic
    - Langchain: https://www.langchain.com/agents
    - Crew AI: https://www.crewai.com/
- **Useful live examples**
    - Selix: https://www.sellscale.com/
    - Replit: https://www.youtube.com/watch?v=IYiVPrxY8-Y&ab_channel=Replit
    - Devin AI: https://www.youtube.com/watch?v=fjHtjT7GO1c

# ✅ Checklist

---

### **User Checklist**

- [ ]  User should be able to chat ‘back and forth’ with the AI
- [ ]  The AI should ask follow up questions as needed to identify sequence content, angle, # steps, etc
    
    <aside>
    💡
    
    Note - a “Brain” to not ask redundant / silly questions (eg company name) would be smart here.
    
    </aside>
    
- [ ]  After enough data is collected, the AI should ‘create a sequence’ (live) on the right workspace
- [ ]  The user should be able to edit the sequence in the workspace on the right
- [ ]  The user should be able to also request edits ‘directly to the AI’

### **Technical Checklist**

- [ ]  Leverage a relational database for data store
- [ ]  Use Flask for the backend and ensure backend is modular
- [ ]  (preferred) Build your own agentic framework to store messages, call tools, and more
    - Or, use an agentic framework like Langchain, OpenAI Assistants, or Crew AI to build out the LLM portion (less preferred but still acceptable)
- [ ]  Ensure the frontend is modular and built in React + Typescript

<aside>
💡

IMPORTANT: Ensure that the core functionality is solid based on the golden flow highlighted in the section titled **Example user workflow**

</aside>

### Bonus 🎉

- [ ]  (agentic) Additional tools - e.g., web browsing, unique architecture, actually sending the messages - anything to help a recruiter do their job even quicker!
- [ ]  (full stack + agentic architecture) Have a way to store ‘context’ about the user + their company during some sort of sign up flow so the AI doesn’t ask silly questions (ex. “Where do you work?”)
- [ ]  (full stack) Have an ability to have multiple ‘sessions’ per user
- [ ]  (full stack) Add ‘streaming’ so the chat experience feels more ChatGPT-esque
- [ ]  (agentic) Display calling_tool notifications in-chat to help the user understand what’s happening

# ⏰ How Long Should I Spend?

---

**Time Window:** Roughly 3 days from when assigned, but please refer to your email for specifics.

You can spend as long or as little as you’d like, but submissions must meet the deadline. Prioritize functionality and clarity. We believe a strong engineer should be able to go above and beyond in `4-8 hours`.

# 🌊 Assessment Criteria

---

We will evaluate submissions based on the following:

- [ ]  Functionality - Does this hit the requirements prescribed in the spec?
- [ ]  Technical Requirements — Is there a backend, frontend, and database?
- [ ]  Solution Elegance — Did you use APIs, libraries, SDKs, etc to move fast?
- [ ]  Code Cleanliness - Can I read the code and easily understand / navigate the codebase?
- [ ]  Quality - Does the app look production-grade, ready to publish for the masses?
- [ ]  Communication — SellScale has a huge Shipyard culture! We love to see clear video demos.
- [ ]  Agentic Architecture - we’ll be reviewing your LLM prompts and agentic architecture as well

# ✉️ Final submission

---

*Submit the following deliverables as part of this challenge. Ensure all components are functional and tested.*

- [ ]  **1. Zip file** - **containing…**
    - The full codebase.
    - A **README** with clear instructions to set up the application locally (test the setup instructions yourself!).

<aside>
⭐

Two videos below - please submit this as a **Loom** or similar in the email body for fast viewing.

</aside>

- [ ]  **2. Product Demo video (2-5 mins):**
    - Show the full functionality of your application.
    - Demonstrate how the user can interact with the chat, see the AI-generated sequence, and edit it dynamically.
- [ ]  **3. Technical Walkthrough video (2-5 mins):**
    - Explain how the app is built.
    - Discuss backend and frontend architecture.
    - Highlight key decisions and improvements you’d make in the future.

—

### Good Luck! 🤞We’re excited to see your deliverable. Remember to be creative and have fun building!