# Matomari

<p align="center">
  <img src="public/readmeimage.svg" alt="Matomari — まとまり" width="260" />
</p>

Matomari is a language learning app built around a **Natural Language Learning (NLL) first approach**, a learning system developed by **Mikel Telleria** during this work at the Innovation Center of the University of Deusto in San Sebastián (Donostia), Spain.

The idea behind Matomari is based on the way humans naturally acquire languages: through meaningful exposure, active recall, and repeated interaction with language that is slightly beyond their current ability.

Learning happens most effectively when the brain is challenged. Instead of only consuming information passively, learners improve by struggling to understand, recall, and produce language. That process of attempting, making mistakes, and correcting yourself helps create stronger connections and deeper understanding.

Using the Language Scenes concept, Matomari organizes learning into focused areas of communication. Each scene represents a specific situation or topic, containing useful sentences, phrases, and conversations that learners can gradually master.

Rather than memorizing isolated words or studying grammar separately, learners build their language ability through complete language chunks and real-world examples. As more scenes are developed, they begin to connect with each other, creating a wider understanding of the language and allowing learners to communicate across more situations.

Each scene focuses on practical language use, such as:

* Introductions
* Daily conversations
* Travel
* Food and restaurants
* Hobbies
* Work and study
* Social interactions
* Expressing opinions
* Advanced conversations

The structure and learning philosophy of Matomari are inspired by Mikel Telleria's **Language Scenes** method and **Natural Language Learning (NLL)** approach.

Credit:

**Mikel Telleria** — Creator of the Language Scenes method and Natural Language Learning (NLL) approach.
View: https://www.nll.coach/

Matomari is an independent implementation of these learning concepts and is not affiliated with or an official product of Mikel Telleria or NLL.

## Development

Matomari is currently in development, with support only for Japanese at the moment. However, the foundational service is complete and ready.

The **main pathway** (structured batch curriculum) is shared by all users and loaded automatically from `/api/pathway`. Personal **language scenes** are stored per user and sync when signed in.

To publish or update the shared pathway after editing content:

```bash
npm run publish-pathway
```

Run `supabase/migrations/002_shared_pathway.sql` in the Postgres editor after applying the above changes (if done so).
