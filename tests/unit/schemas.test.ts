import { describe, expect, it } from 'vitest';

import { courseSchema, lessonSchema, videoSourceSchema, worksheetSchema } from '@/lib/schemas';

const validLesson = {
  title: 'Google Meu Negócio: apareça quando buscarem por você',
  course: 'colocando-seu-negocio-no-digital',
  order: 1,
  video: { provider: 'youtube', id: 'AULA0000001' },
  durationSeconds: 480,
  summary: 'Coloque seu negócio no mapa e apareça na busca do Google.',
  worksheet: '01-google-meu-negocio',
};

describe('videoSourceSchema', () => {
  it('accepts a well-formed YouTube source', () => {
    const result = videoSourceSchema.safeParse({ provider: 'youtube', id: 'AULA0000001' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['too short', 'abc'],
    ['too long', 'AULA00000012'],
    ['contains a slash', 'AULA/000001'],
    ['contains a space', 'AULA 000001'],
    ['empty', ''],
    ['a full URL instead of an id', 'https://youtu.be/AULA0000001'],
  ])('rejects a YouTube id that is %s', (_label, id) => {
    const result = videoSourceSchema.safeParse({ provider: 'youtube', id });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown provider', () => {
    const result = videoSourceSchema.safeParse({ provider: 'vimeo', id: 'AULA0000001' });
    expect(result.success).toBe(false);
  });

  it('accepts the hls arm so migrating off YouTube is additive', () => {
    const result = videoSourceSchema.safeParse({
      provider: 'hls',
      src: 'https://videos.example.com/aula-01/master.m3u8',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an hls source whose src is not a URL', () => {
    const result = videoSourceSchema.safeParse({ provider: 'hls', src: 'master.m3u8' });
    expect(result.success).toBe(false);
  });
});

describe('lessonSchema', () => {
  it('accepts a complete lesson', () => {
    const result = lessonSchema.safeParse(validLesson);
    expect(result.success).toBe(true);
  });

  it('defaults published to true so authors do not have to set it', () => {
    const result = lessonSchema.parse(validLesson);
    expect(result.published).toBe(true);
  });

  it('treats the worksheet as optional', () => {
    const { worksheet: _worksheet, ...withoutWorksheet } = validLesson;
    expect(lessonSchema.safeParse(withoutWorksheet).success).toBe(true);
  });

  it('rejects a non-positive order', () => {
    expect(lessonSchema.safeParse({ ...validLesson, order: 0 }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...validLesson, order: -1 }).success).toBe(false);
  });

  it('rejects a fractional order, which would make sorting ambiguous', () => {
    expect(lessonSchema.safeParse({ ...validLesson, order: 1.5 }).success).toBe(false);
  });

  it('rejects a course slug that is not kebab-case', () => {
    expect(lessonSchema.safeParse({ ...validLesson, course: 'Curso Um' }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...validLesson, course: 'curso_um' }).success).toBe(false);
  });

  it('rejects a zero or negative duration', () => {
    expect(lessonSchema.safeParse({ ...validLesson, durationSeconds: 0 }).success).toBe(false);
  });

  it('rejects an implausibly long duration (guards against ms/seconds mix-ups)', () => {
    expect(lessonSchema.safeParse({ ...validLesson, durationSeconds: 480_000 }).success).toBe(
      false
    );
  });

  it('rejects an empty title', () => {
    expect(lessonSchema.safeParse({ ...validLesson, title: '' }).success).toBe(false);
  });
});

describe('courseSchema', () => {
  const validCourse = {
    title: 'Colocando seu negócio no digital',
    description: 'Aprenda o essencial para vender pela internet sem gastar nada.',
    level: 'iniciante',
    order: 1,
  };

  it('accepts a valid course and defaults published to true', () => {
    const parsed = courseSchema.parse(validCourse);
    expect(parsed.published).toBe(true);
  });

  it('rejects a level outside the allowed set', () => {
    expect(courseSchema.safeParse({ ...validCourse, level: 'expert' }).success).toBe(false);
  });

  it('rejects a description longer than search engines display', () => {
    const result = courseSchema.safeParse({ ...validCourse, description: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('worksheetSchema', () => {
  it('accepts a valid worksheet', () => {
    const result = worksheetSchema.safeParse({
      title: 'Checklist do Google Meu Negócio',
      lesson: '01-google-meu-negocio',
    });
    expect(result.success).toBe(true);
  });

  it('requires the lesson reference', () => {
    expect(worksheetSchema.safeParse({ title: 'Checklist' }).success).toBe(false);
  });
});
