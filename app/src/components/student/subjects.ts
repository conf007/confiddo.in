export interface SubjectMeta {
  icon: string
  name: string
}

export function subjectMeta(subject: string): SubjectMeta {
  const s = subject.toLowerCase()
  if (s.includes('math')) return { icon: '🔢', name: 'Math' }
  if (s.includes('english')) return { icon: '📖', name: 'English' }
  if (s.includes('hindi')) return { icon: '🇮🇳', name: 'Hindi' }
  if (s.includes('science')) return { icon: '🔬', name: 'Science' }
  if (s.includes('social')) return { icon: '🌍', name: 'Social Studies' }
  return { icon: '📚', name: subject ? subject[0].toUpperCase() + subject.slice(1) : subject }
}
