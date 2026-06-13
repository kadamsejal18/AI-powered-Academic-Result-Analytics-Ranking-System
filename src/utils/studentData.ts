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
  {
    id: 's1',
    name: 'Aarav Sharma',
    rollNumber: '2026A01',
    className: 'Grade 12-A',
    scores: { mathematics: 99, physics: 98, chemistry: 97, english: 95, computerScience: 100 },
    totalObtained: 489,
    maxTotal: 500,
    percentage: 97.8,
    grade: 'A+',
    rank: 1,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'Computer Science',
      weakestSubject: 'English',
      improvementSuggestion: 'Exceptional performance. Guide him to participate in competitive programming or olympiads.',
      trend: 'improving',
    },
  },
  {
    id: 's2',
    name: 'Emily Watson',
    rollNumber: '2026A02',
    className: 'Grade 12-A',
    scores: { mathematics: 96, physics: 94, chemistry: 95, english: 98, computerScience: 94 },
    totalObtained: 477,
    maxTotal: 500,
    percentage: 95.4,
    grade: 'A+',
    rank: 2,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Physics',
      improvementSuggestion: 'Highly articulate in literature. Encourage writing research-oriented papers or technical journals.',
      trend: 'improving',
    },
  },
  {
    id: 's3',
    name: 'Carlos Mendez',
    rollNumber: '2026B01',
    className: 'Grade 12-B',
    scores: { mathematics: 92, physics: 90, chemistry: 89, english: 88, computerScience: 93 },
    totalObtained: 452,
    maxTotal: 500,
    percentage: 90.4,
    grade: 'A',
    rank: 3,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'Computer Science',
      weakestSubject: 'English',
      improvementSuggestion: 'Very strong STEM foundation. Work on structural writing styles to match technical proficiency.',
      trend: 'stable',
    },
  },
  {
    id: 's4',
    name: 'Yuki Tanaka',
    rollNumber: '2026A03',
    className: 'Grade 12-A',
    scores: { mathematics: 88, physics: 85, chemistry: 90, english: 92, computerScience: 86 },
    totalObtained: 441,
    maxTotal: 500,
    percentage: 88.2,
    grade: 'A',
    rank: 4,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Physics',
      improvementSuggestion: 'Consistent student. A bit of focus on physics derivations will boost scores to A+ tier.',
      trend: 'stable',
    },
  },
  {
    id: 's5',
    name: 'Zara Ahmed',
    rollNumber: '2026B02',
    className: 'Grade 12-B',
    scores: { mathematics: 85, physics: 82, chemistry: 80, english: 94, computerScience: 88 },
    totalObtained: 429,
    maxTotal: 500,
    percentage: 85.8,
    grade: 'A',
    rank: 5,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Chemistry',
      improvementSuggestion: 'Superb creative skills. Needs additional practice in complex chemical equation balancing.',
      trend: 'improving',
    },
  },
  {
    id: 's6',
    name: 'Priya Patel',
    rollNumber: '2026A04',
    className: 'Grade 12-A',
    scores: { mathematics: 80, physics: 82, chemistry: 85, english: 84, computerScience: 81 },
    totalObtained: 412,
    maxTotal: 500,
    percentage: 82.4,
    grade: 'B',
    rank: 6,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'Chemistry',
      weakestSubject: 'Mathematics',
      improvementSuggestion: 'Balanced profile. Increasing math practice will assist with physical chemistry topics.',
      trend: 'stable',
    },
  },
  {
    id: 's7',
    name: 'Michael Chen',
    rollNumber: '2026B03',
    className: 'Grade 12-B',
    scores: { mathematics: 78, physics: 76, chemistry: 74, english: 80, computerScience: 82 },
    totalObtained: 390,
    maxTotal: 500,
    percentage: 78.0,
    grade: 'B',
    rank: 7,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'Computer Science',
      weakestSubject: 'Chemistry',
      improvementSuggestion: 'Good analytical capability. Recommend hands-on organic chemistry lab activities for concept building.',
      trend: 'improving',
    },
  },
  {
    id: 's8',
    name: 'Liam O\'Connor',
    rollNumber: '2026A05',
    className: 'Grade 12-A',
    scores: { mathematics: 68, physics: 72, chemistry: 70, english: 75, computerScience: 69 },
    totalObtained: 354,
    maxTotal: 500,
    percentage: 70.8,
    grade: 'C',
    rank: 8,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'Physics',
      weakestSubject: 'Mathematics',
      improvementSuggestion: 'Averages are healthy, but struggles with advanced algebra. Dedicated tutoring in calculus will help.',
      trend: 'stable',
    },
  },
  {
    id: 's9',
    name: 'Fatima Al-Sayed',
    rollNumber: '2026B04',
    className: 'Grade 12-B',
    scores: { mathematics: 62, physics: 65, chemistry: 60, english: 78, computerScience: 61 },
    totalObtained: 326,
    maxTotal: 500,
    percentage: 65.2,
    grade: 'C',
    rank: 9,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Chemistry',
      improvementSuggestion: 'Comfortable with language studies. Visual aids or animations could help in physics/chemistry definitions.',
      trend: 'declining',
    },
  },
  {
    id: 's10',
    name: 'John Doe',
    rollNumber: '2026A06',
    className: 'Grade 12-A',
    scores: { mathematics: 58, physics: 55, chemistry: 56, english: 62, computerScience: 59 },
    totalObtained: 290,
    maxTotal: 500,
    percentage: 58.0,
    grade: 'D',
    rank: 10,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Physics',
      improvementSuggestion: 'Needs comprehensive revision of high school mechanics. Needs structure in homework submissions.',
      trend: 'declining',
    },
  },
  {
    id: 's11',
    name: 'Sarah Jenkins',
    rollNumber: '2026B05',
    className: 'Grade 12-B',
    scores: { mathematics: 50, physics: 52, chemistry: 48, english: 58, computerScience: 51 },
    totalObtained: 259,
    maxTotal: 500,
    percentage: 51.8,
    grade: 'D',
    rank: 11,
    status: 'Pass',
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Chemistry',
      improvementSuggestion: 'Borderline grades. Recommend interactive mock exams and focused science study sessions.',
      trend: 'stable',
    },
  },
  {
    id: 's12',
    name: 'Lucas Silva',
    rollNumber: '2026A07',
    className: 'Grade 12-A',
    scores: { mathematics: 35, physics: 42, chemistry: 38, english: 55, computerScience: 40 },
    totalObtained: 210,
    maxTotal: 500,
    percentage: 42.0,
    grade: 'F',
    rank: 12,
    status: 'Fail', // Failed since Maths (35) and Chemistry (38) are below passing grade 40
    aiInsights: {
      strongestSubject: 'English',
      weakestSubject: 'Mathematics',
      improvementSuggestion: 'CRITICAL ATTENTION: Mathematics score is below passing. Needs direct tutor assistance and remedial classes.',
      trend: 'declining',
    },
  },
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
  const percentage = parseFloat(( (totalObtained / maxTotal) * 100 ).toFixed(1));
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
