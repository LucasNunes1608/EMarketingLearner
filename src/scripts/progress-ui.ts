import { completionPercent, lessonPath } from '@/lib/content';
import {
  completedCount,
  isCourseComplete,
  isLessonComplete,
  type ProgressState,
  setLastWatched,
  toggleLesson,
} from '@/lib/progress';
import {
  getBrowserStorage,
  loadProgress,
  saveProgress,
  type StorageLike,
} from '@/lib/progress-store';

/**
 * Wires stored progress into the markup.
 *
 * Every progress affordance is server-rendered in its "nothing recorded yet"
 * state and revealed here, so a learner with JavaScript disabled or still
 * downloading sees a coherent page rather than a flash of empty widgets.
 */

const DONE_CLASSES = ['bg-brand-100', 'text-brand-800'];
const PENDING_CLASSES = ['bg-surface-alt', 'text-ink-700'];

function show(element: HTMLElement | null): void {
  if (element) element.hidden = false;
}

function updateCourseProgressUi(state: ProgressState): void {
  const section = document.querySelector<HTMLElement>('[data-course-progress]');
  if (!section) return;

  const course = section.dataset.courseProgress;
  const total = Number(section.dataset.courseTotal ?? '0');
  if (!course) return;

  const done = completedCount(state, course);
  const percent = completionPercent(done, total);

  const label = section.querySelector<HTMLElement>('[data-progress-label]');
  if (label) {
    label.textContent =
      done === 0
        ? 'Você ainda não começou este curso.'
        : done >= total
          ? `Parabéns! Você concluiu as ${total} aulas.`
          : `${done} de ${total} aulas concluídas (${percent}%).`;
  }

  const bar = section.querySelector<HTMLElement>('[data-progress-bar]');
  bar?.setAttribute('aria-valuenow', String(percent));

  const fill = section.querySelector<HTMLElement>('[data-progress-fill]');
  if (fill) fill.style.width = `${percent}%`;

  if (isCourseComplete(state, course, total)) {
    show(section.querySelector<HTMLElement>('[data-certificate-link]'));
  }

  // Tick the individual lessons in the list.
  for (const badge of document.querySelectorAll<HTMLElement>('[data-lesson-badge]')) {
    const slug = badge.dataset.lessonBadge;
    if (!slug || !isLessonComplete(state, course, slug)) continue;

    badge.textContent = '✓';
    badge.classList.remove(...PENDING_CLASSES);
    badge.classList.add(...DONE_CLASSES);
    show(document.querySelector<HTMLElement>(`[data-lesson-done-label="${CSS.escape(slug)}"]`));
  }
}

function updateCompleteButton(button: HTMLElement, done: boolean): void {
  button.setAttribute('aria-pressed', String(done));

  const label = button.querySelector<HTMLElement>('[data-complete-label]');
  if (label) {
    label.textContent = done ? '✓ Aula concluída' : 'Marcar aula como concluída';
  }

  // Filled while pending, outlined once done — colour is never the only signal,
  // the label and aria-pressed both change too.
  button.classList.toggle('bg-brand-700', !done);
  button.classList.toggle('text-white', !done);
  button.classList.toggle('hover:bg-brand-800', !done);
  button.classList.toggle('bg-brand-50', done);
  button.classList.toggle('text-brand-800', done);
  button.classList.toggle('hover:bg-brand-100', done);
}

function initLessonPage(state: ProgressState, storage: StorageLike | null): ProgressState {
  const article = document.querySelector<HTMLElement>('[data-lesson]');
  const button = document.querySelector<HTMLElement>('[data-toggle-complete]');
  if (!article) return state;

  const lesson = article.dataset.lesson;
  const course = article.dataset.lessonCourse;
  if (!lesson || !course) return state;

  // Opening a lesson is what "where I left off" means, so record it immediately
  // rather than waiting for the learner to mark anything complete.
  const title = document.querySelector('h1')?.textContent?.trim() ?? lesson;
  let current = setLastWatched(state, { course, lesson, title });
  saveProgress(storage, current);

  if (!button) return current;

  updateCompleteButton(button, isLessonComplete(current, course, lesson));

  button.addEventListener('click', () => {
    current = toggleLesson(current, course, lesson);
    const saved = saveProgress(storage, current);
    updateCompleteButton(button, isLessonComplete(current, course, lesson));

    const hint = document.querySelector<HTMLElement>('[data-complete-hint]');
    if (hint && !saved) {
      hint.textContent =
        'Não foi possível salvar neste navegador. Seu progresso não será lembrado.';
    }
  });

  return current;
}

function initHomePage(state: ProgressState): void {
  const section = document.querySelector<HTMLElement>('[data-continue-section]');

  if (section && state.last) {
    const link = section.querySelector<HTMLAnchorElement>('[data-continue-link]');
    const title = section.querySelector<HTMLElement>('[data-continue-title]');
    if (link) link.href = lessonPath(state.last.course, state.last.lesson);
    if (title) title.textContent = state.last.title;
    section.hidden = false;
  }

  for (const summary of document.querySelectorAll<HTMLElement>('[data-course-progress-summary]')) {
    const course = summary.dataset.courseProgressSummary;
    const total = Number(summary.dataset.courseTotal ?? '0');
    if (!course || total <= 0) continue;

    const done = completedCount(state, course);
    if (done === 0) continue;

    summary.textContent =
      done >= total
        ? 'Curso concluído ✓'
        : `${done} de ${total} aulas concluídas (${completionPercent(done, total)}%)`;
    summary.hidden = false;
  }
}

export function initProgressUi(): void {
  const storage = getBrowserStorage();
  const stored = loadProgress(storage);

  // The lesson page writes last-watched, so run it first and reuse its result.
  const state = initLessonPage(stored, storage);

  updateCourseProgressUi(state);
  initHomePage(state);
}
