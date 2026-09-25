import {
  buildCourseUnitsByClass,
  buildCourseUnitsForClass,
  resolveCascadedCourseUnits,
} from '../../lib/qa-filter-cascade';

describe('qa-filter-cascade', () => {
  it('limits course units to the selected class course', () => {
    expect(
      buildCourseUnitsForClass(
        'BAE Y1S1 Day',
        [
          { name: 'BAE Y1S1 Day', courseId: 'c1', courseName: 'Microeconomics', courseCode: 'ECO101' },
          { name: 'BBA Y1S1 Day', courseId: 'c2', courseName: 'Accounting', courseCode: 'ACC101' },
        ],
        ['Microeconomics', 'Accounting', 'Statistics']
      )
    ).toEqual(['Microeconomics']);
  });

  it('falls back to department course list when no class is selected', () => {
    expect(
      buildCourseUnitsForClass(null, [], ['Accounting', 'Microeconomics'])
    ).toEqual(['Accounting', 'Microeconomics']);
  });

  it('builds course-unit options per class from report rows', () => {
    const byClass = buildCourseUnitsByClass([
      { class: 'BAE Y1S1 Day', courseUnit: 'Microeconomics' },
      { class: 'BAE Y1S1 Day, BBA Y1S1 Day', courseUnit: 'ICT' },
      { class: 'BBA Y1S1 Day', courseUnit: 'Accounting' },
    ]);
    expect(byClass['BAE Y1S1 Day']).toEqual(['ICT', 'Microeconomics']);
    expect(resolveCascadedCourseUnits({
      selectedClass: 'BAE Y1S1 Day',
      allCourseUnits: ['Accounting', 'ICT', 'Microeconomics'],
      courseUnitsByClass: byClass,
    })).toEqual(['ICT', 'Microeconomics']);
  });
});
