# Authoring guide

How to add courses, lessons and worksheets. No CMS, no login — you write Markdown and
push. Everything is validated at build time, so mistakes fail loudly instead of shipping.

Learner-facing text is **Brazilian Portuguese**. File names, field names and code stay
in English.

---

## Where things live

```
src/content/
├── courses/<course-slug>.md
├── lessons/<course-slug>/<NN>-<lesson-slug>.mdx
└── worksheets/<NN>-<lesson-slug>.md
```

Slugs are lowercase, hyphen-separated, no accents: `pix-e-pagamentos`, not
`Pix_e_Pagamentos` or `pix-e-pagamentós`. The slug becomes the URL.

---

## Adding a course

`src/content/courses/vendendo-mais-no-whatsapp.md`

```markdown
---
title: 'Vendendo mais no WhatsApp'
description: 'Transforme conversas em vendas com organização simples e respostas prontas.'
level: 'iniciante'
order: 2
published: true
---

Dois ou três parágrafos em pt-BR: para quem é o curso, o que a pessoa vai
conseguir fazer no fim, e que é totalmente gratuito.
```

| Field         | Rules                                                   |
| ------------- | ------------------------------------------------------- |
| `title`       | 1–80 characters                                         |
| `description` | 1–200 characters — this is the meta description too     |
| `level`       | exactly one of `iniciante`, `intermediario`, `avancado` |
| `order`       | non-negative integer; lower sorts first in the catalog  |
| `published`   | `false` keeps a draft in the repo without publishing it |

---

## Adding a lesson

Create `src/content/lessons/<course-slug>/` if it does not exist. **The directory name
must match the `course` field** — a mismatch fails the build, because a lesson filed
under the wrong course is almost always a copy-paste error.

`src/content/lessons/vendendo-mais-no-whatsapp/01-respostas-rapidas.mdx`

```markdown
---
title: 'Respostas rápidas: pare de digitar a mesma coisa'
course: 'vendendo-mais-no-whatsapp'
order: 1
video:
  provider: 'youtube'
  id: 'AULA0000001'
durationSeconds: 480
summary: 'Monte atalhos para as perguntas que você responde dez vezes por dia.'
worksheet: '01-respostas-rapidas'
published: true
---

Um parágrafo curto nomeando o problema concreto que a pessoa tem.

## O que você vai fazer nesta aula

- Três a cinco resultados concretos

## Passo a passo

1. **Passos numerados e acionáveis.** Nomes de menu reais quando você tiver certeza.
2. Se não tiver certeza do nome exato de um botão, descreva onde ele fica.

## Erros comuns

- **O erro.** Como corrigir.

## Sua tarefa

Uma tarefa de 15 minutos que a pessoa faz agora.
```

| Field             | Rules                                                                |
| ----------------- | -------------------------------------------------------------------- |
| `title`           | 1–120 characters                                                     |
| `course`          | must match an existing course slug **and** the parent directory name |
| `order`           | positive integer, **unique within the course**                       |
| `video.provider`  | `youtube` (or `hls` — see README for the self-hosted path)           |
| `video.id`        | exactly 11 characters, `A–Z a–z 0–9 _ -`                             |
| `durationSeconds` | positive integer, max 4 hours                                        |
| `summary`         | 1–200 characters; shown in listings and as the meta description      |
| `worksheet`       | optional; must match a worksheet slug                                |

### Writing voice

The reader runs a small business and is not technical. Short sentences. Real Brazilian
context — Pix, MEI, WhatsApp, Google Maps. No jargon, no anglicisms where a Portuguese
word exists, no corporate tone.

**Do not invent numbers.** Fees, revenue ceilings and prices change and vary by bank. If
you are not certain of a figure, write the guidance without it and tell the reader where
to check — that is what the existing lessons do.

Use plain Markdown. No JSX, no `import` statements, even in `.mdx` files.

---

## Adding a worksheet

`src/content/worksheets/01-respostas-rapidas.md`

```markdown
---
title: 'Folha de exercício: suas 10 respostas prontas'
lesson: '01-respostas-rapidas'
---

Imprima ou responda pelo celular.

## 1. Suas perguntas mais frequentes

- [ ] Pergunta 1: ______________________________________
- [ ] Pergunta 2: ______________________________________

| Atalho | Mensagem completa |
| ------ | ----------------- |
|        |                   |
```

The worksheet must stand alone — someone who only receives the PDF on WhatsApp, without
watching the video, should still get value from it. That is what actually gets forwarded.

Fill-in blanks are runs of underscores. `- [ ]` renders as a printable empty box (a
build-time plugin replaces the default disabled checkbox, which browsers grey out and
which screen readers flag as an unlabelled form field).

> **`src/content/` is excluded from Prettier**, deliberately. Prettier reads `____:____`
> as Markdown bold and a line of underscores as a horizontal rule, and rewrites both —
> silently destroying the printable exercise. Do not remove that ignore rule.

---

## Publishing checklist

```bash
npm run build      # schema + integrity validation runs here
npm run preview    # check it on a narrow window — most learners are on a phone
```

The build fails if: a video ID is malformed, a lesson references a missing course or
worksheet, a lesson sits in a directory that disagrees with its `course` field, two
lessons in a course share an `order`, or a worksheet points at a lesson that does not
exist. All problems are reported at once, so one build shows you everything.

If you add a batch of files and see spurious `Duplicate id` warnings, clear the content
cache:

```bash
rm -rf .astro node_modules/.astro && npx astro sync
```
