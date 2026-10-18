import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {splitParagraphs,validateLesson,AUDIENCES} from '../lib/lesson.mjs';

test('every shipped sample has usable source references, concept links, and answer indices', async () => {
  const samples = JSON.parse(await readFile(new URL('../public/examples.json',import.meta.url),'utf8'));
  assert.deepEqual(new Set(samples.map(sample=>sample.audience)),new Set(AUDIENCES));
  assert.equal(new Set(samples.map(sample=>sample.id)).size,samples.length);
  for(const sample of samples){
    assert.ok(sample.source.length>=80 && sample.source.length<=20000);
    assert.doesNotThrow(()=>validateLesson(sample.lesson,splitParagraphs(sample.source)),sample.id);
    assert.equal(sample.lesson.concepts.length,4);
    assert.equal(sample.lesson.quiz.length,3);
    for(const question of sample.lesson.quiz)assert.equal(new Set(question.options).size,4);
  }
});
