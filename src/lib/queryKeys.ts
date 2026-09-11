/**
 * Central query-key factory so invalidation stays consistent across hooks.
 * Convention: [domain, ...filters]
 */
export const queryKeys = {
  users: {
    mentees: (lecturerId: string) => ['users', 'mentees', lecturerId] as const,
    mentor: (studentId: string) => ['users', 'mentor', studentId] as const,
    all: () => ['users', 'all'] as const,
    profile: (userId: string) => ['users', 'profile', userId] as const,
  },
  tasks: {
    byLecturer: (lecturerId: string) => ['tasks', 'lecturer', lecturerId] as const,
    byMentor: (mentorId: string) => ['tasks', 'mentor', mentorId] as const,
    submissions: (taskId: string) => ['tasks', 'submissions', taskId] as const,
    mySubmission: (taskId: string, studentId: string) =>
      ['tasks', 'submission', taskId, studentId] as const,
  },
  announcements: {
    byLecturer: (lecturerId: string) => ['announcements', 'lecturer', lecturerId] as const,
    byMentor: (mentorId: string) => ['announcements', 'mentor', mentorId] as const,
  },
  chat: {
    personal: (userA: string, userB: string) =>
      ['chat', 'personal', [userA, userB].sort().join(':')] as const,
    group: (groupId: string) => ['chat', 'group', groupId] as const,
    myGroup: (lecturerOrMentorId: string) => ['chat', 'myGroup', lecturerOrMentorId] as const,
    groups: (userId: string) => ['chat', 'groups', userId] as const,
    studentSearch: (query: string) => ['chat', 'studentSearch', query] as const,
  },
notifications: {
  byUser: (userId: string) => ['notifications', userId] as const,
},
admin: {
  all: ['admin'] as const,
  students: (programme?: string) => [...['admin', 'students', programme] as const],
  mentors: () => ['admin', 'mentors'] as const,
  activity: (userId: string) => ['admin', 'activity', userId] as const,
  search: (q: string) => ['admin', 'search', q] as const,
  unassigned: (programme?: string) => ['admin', 'unassigned', programme] as const,
},
}
