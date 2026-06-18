export interface SubjectScores {
  mathematics: number;
  physics: number;
  chemistry: number;
  english: number;
  computerScience: number;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
  scores: SubjectScores;
  totalObtained: number;
  maxTotal: number;
  percentage: number;
  grade: string;
  rank: number;
  status: 'Pass' | 'Fail';
  aiInsights: {
    strongestSubject: string;
    weakestSubject: string;
    improvementSuggestion: string;
    trend: 'improving' | 'stable' | 'declining';
  };
}

export const SUBJECT_NAMES: Record<keyof SubjectScores, string> = {
  mathematics: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  english: 'English',
  computerScience: 'Computer Science',
};

export const INITIAL_STUDENTS: Student[] = [

];

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export function sortAndRankStudents(students: Omit<Student, 'rank'>[]): Student[] {
  // Sort by percentage descending
  const sorted = [...students].sort((a, b) => b.percentage - a.percentage);

  // Assign ranks
  return sorted.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));
}

export function addStudentAndReRank(
  currentStudents: Student[],
  newStudentData: Omit<Student, 'id' | 'rank' | 'totalObtained' | 'maxTotal' | 'percentage' | 'grade' | 'status' | 'aiInsights'>
): Student[] {
  const totalObtained =
    newStudentData.scores.mathematics +
    newStudentData.scores.physics +
    newStudentData.scores.chemistry +
    newStudentData.scores.english +
    newStudentData.scores.computerScience;

  const maxTotal = 500;
  const percentage = parseFloat(((totalObtained / maxTotal) * 100).toFixed(1));
  const grade = calculateGrade(percentage);

  // Check pass/fail status
  const hasFailed = Object.values(newStudentData.scores).some(score => score < 40);
  const status = hasFailed ? 'Fail' : 'Pass';

  // Compute AI insights dynamically
  const entries = Object.entries(newStudentData.scores) as [keyof SubjectScores, number][];
  const sortedScores = [...entries].sort((a, b) => b[1] - a[1]);
  const strongest = SUBJECT_NAMES[sortedScores[0][0]];
  const weakest = SUBJECT_NAMES[sortedScores[sortedScores.length - 1][0]];

  let suggestion = '';
  if (percentage >= 90) {
    suggestion = `Outstanding potential shown in ${strongest}. Recommended for advanced studies or mentoring peers.`;
  } else if (percentage >= 75) {
    suggestion = `Solid foundation. Focus on bridging the gap in ${weakest} to enter the elite score bracket.`;
  } else if (percentage >= 55) {
    suggestion = `Moderate performance. Increase weekly revision hours in ${weakest} and practice past examination papers.`;
  } else {
    suggestion = `Needs immediate support. Enlist ${newStudentData.name} in remedial classes for ${weakest} and monitor weekly logs.`;
  }

  const aiInsights: Student['aiInsights'] = {
    strongestSubject: strongest,
    weakestSubject: weakest,
    improvementSuggestion: suggestion,
    trend: percentage >= 80 ? 'improving' : 'stable',
  };

  const newStudent: Student = {
    ...newStudentData,
    id: 's' + (currentStudents.length + 1) + '_' + Date.now(),
    totalObtained,
    maxTotal,
    percentage,
    grade,
    status,
    aiInsights,
    rank: 0, // temporary
  };

  // Merge lists (without rank parameter) and re-rank them
  const mergedList = [...currentStudents, newStudent].map(({ rank: _, ...rest }) => rest);
  return sortAndRankStudents(mergedList);
}
