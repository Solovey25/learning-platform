// Types
export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  quiz: Quiz[];
  completed?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  chapters: Chapter[];
  progress?: number;
  enrolled?: boolean;
}

// Mock data
export const MOCK_COURSES: Course[] = [
  {
    id: "1",
    title: "Основы Git и командной строки",
    description: "Разбери базовые команды Git и CLI, чтобы уверенно работать с репозиториями.",
    imageUrl: "https://www.svgrepo.com/show/303548/git-icon-logo.svg",
    chapters: [
      {
        id: "1-1",
        title: "Первые шаги с Git",
        content: `
          <h1>Первые шаги с Git</h1>
          <p>Git помогает отслеживать историю изменений и работать над кодом в команде.</p>
          
          <h2>Минимальный набор команд</h2>
          <ul>
            <li><code>git init</code> — инициализация репозитория</li>
            <li><code>git status</code> — проверка состояния файлов</li>
            <li><code>git add</code> — подготовка файлов к коммиту</li>
            <li><code>git commit</code> — сохранение снимка изменений</li>
          </ul>
          
          <h2>Простой рабочий цикл</h2>
          <ol>
            <li>Внести изменения в файлы</li>
            <li>Проверить состояние командой <code>git status</code></li>
            <li>Добавить файлы в индекс через <code>git add</code></li>
            <li>Закоммитить изменения командой <code>git commit -m "сообщение"</code></li>
          </ol>
        `,
        quiz: [
          {
            id: "q1-1",
            question: "Какой командой инициализируют новый Git‑репозиторий?",
            options: ["git start", "git init", "git new", "git repo"],
            correctOption: 1
          },
          {
            id: "q1-2",
            question: "Как посмотреть список изменённых файлов перед коммитом?",
            options: ["git files", "git diff", "git status", "git log"],
            correctOption: 2
          }
        ]
      },
      {
        id: "1-2",
        title: "Команды для навигации в CLI",
        content: `
          <h1>Команды для навигации в командной строке</h1>
          <p>Умение быстро перемещаться по файловой системе ускоряет работу с Git.</p>
          
          <h2>Базовые команды</h2>
          <ul>
            <li><code>pwd</code> — показать текущую директорию</li>
            <li><code>ls</code> / <code>dir</code> — вывести список файлов</li>
            <li><code>cd</code> — сменить директорию</li>
            <li><code>mkdir</code> — создать папку</li>
          </ul>
          
          <h2>Практика</h2>
          <p>Попробуй перейти в папку проекта и инициализировать там Git‑репозиторий:</p>
          <pre><code>cd /путь/к/проекту
git init</code></pre>
        `,
        quiz: [
          {
            id: "q2-1",
            question: "Какой командой посмотреть, где ты сейчас находишься?",
            options: ["whereami", "pwd", "ls", "cd"],
            correctOption: 1
          },
          {
            id: "q2-2",
            question: "Как создать новую директорию из командной строки?",
            options: ["mkfile", "mkdir", "newdir", "touch"],
            correctOption: 1
          }
        ]
      }
    ]
  },
  {
    id: "2",
    title: "Ветки и работа с ними в Git",
    description: "Научись создавать ветки, переключаться между ними и объединять изменения.",
    imageUrl: "https://www.svgrepo.com/show/303548/git-icon-logo.svg",
    chapters: [
      {
        id: "2-1",
        title: "Создание и переключение веток",
        content: `
          <h1>Создание и переключение веток</h1>
          <p>Ветки позволяют экспериментировать с изменениями, не ломая основную линию разработки.</p>
          
          <h2>Основные команды</h2>
          <ul>
            <li><code>git branch feature-x</code> — создать новую ветку</li>
            <li><code>git checkout feature-x</code> — переключиться на ветку</li>
            <li><code>git switch feature-x</code> — современный способ переключения</li>
          </ul>
          
          <h2>Простой сценарий</h2>
          <ol>
            <li>Создай ветку для задачи</li>
            <li>Перейди в неё</li>
            <li>Сделай несколько коммитов</li>
            <li>Подготовь ветку к объединению</li>
          </ol>
        `,
        quiz: [
          {
            id: "q3-1",
            question: "Как создать новую ветку feature/login?",
            options: [
              "git new feature/login",
              "git branch feature/login",
              "git create feature/login",
              "git checkout feature/login"
            ],
            correctOption: 1
          },
          {
            id: "q3-2",
            question: "Как переключиться на существующую ветку main?",
            options: [
              "git switch main",
              "git status main",
              "git init main",
              "git commit main"
            ],
            correctOption: 0
          }
        ]
      }
    ]
  }
];

// Helper function to get a course by ID
export const getCourseById = (id: string): Course | undefined => {
  return MOCK_COURSES.find(course => course.id === id);
};

// Helper function to get a chapter by ID
export const getChapterById = (courseId: string, chapterId: string): Chapter | undefined => {
  const course = getCourseById(courseId);
  return course?.chapters.find(chapter => chapter.id === chapterId);
};

// Helper function to update courses (for admin functionality)
let courses = [...MOCK_COURSES];

export const getAllCourses = (): Course[] => {
  return courses;
};

export const addCourse = (course: Omit<Course, "id">): Course => {
  const newCourse = {
    ...course,
    id: `${courses.length + 1}`,
  };
  courses = [...courses, newCourse];
  return newCourse;
};

export const updateCourse = (courseId: string, updatedCourse: Partial<Course>): Course | undefined => {
  const index = courses.findIndex(c => c.id === courseId);
  if (index !== -1) {
    courses[index] = { ...courses[index], ...updatedCourse };
    return courses[index];
  }
  return undefined;
};

export const deleteCourse = (courseId: string): boolean => {
  const initialLength = courses.length;
  courses = courses.filter(c => c.id !== courseId);
  return courses.length !== initialLength;
};

// User progress tracking
const userProgress: Record<string, Record<string, { completed: boolean }>> = {};

export const markChapterCompleted = (userId: string, courseId: string, chapterId: string): void => {
  if (!userProgress[userId]) {
    userProgress[userId] = {};
  }
  if (!userProgress[userId][courseId]) {
    userProgress[userId][courseId] = { completed: false };
  }
  userProgress[userId][`${courseId}-${chapterId}`] = { completed: true };
};

export const isChapterCompleted = (userId: string, courseId: string, chapterId: string): boolean => {
  return !!userProgress[userId]?.[`${courseId}-${chapterId}`]?.completed;
};

export const getCourseProgress = (userId: string, courseId: string): number => {
  const course = getCourseById(courseId);
  if (!course) return 0;
  
  const totalChapters = course.chapters.length;
  if (totalChapters === 0) return 0;
  
  let completedChapters = 0;
  course.chapters.forEach(chapter => {
    if (isChapterCompleted(userId, courseId, chapter.id)) {
      completedChapters++;
    }
  });
  
  return Math.round((completedChapters / totalChapters) * 100);
};

export const getUserCourses = (userId: string): Course[] => {
  return courses.map(course => ({
    ...course,
    progress: getCourseProgress(userId, course.id),
    enrolled: Object.keys(userProgress[userId] || {}).some(key => key.startsWith(course.id)),
    chapters: course.chapters.map(chapter => ({
      ...chapter,
      completed: isChapterCompleted(userId, course.id, chapter.id)
    }))
  }));
};
