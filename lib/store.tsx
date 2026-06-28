'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from './supabase'

interface Project {
  id?: string
  title: string
  topic: string
  script: string
  storyboard: any[]
  characters: any[]
  status: string
}

interface StoreContextType {
  project: Project
  setProject: (p: Partial<Project>) => void
  saveProject: () => Promise<string | null>
  projects: Project[]
  loadProjects: () => Promise<void>
  userId: string | null
}

const defaultProject: Project = {
  title: '',
  topic: '',
  script: '',
  storyboard: [],
  characters: [],
  status: 'draft'
}

const StoreContext = createContext<StoreContextType>({
  project: defaultProject,
  setProject: () => {},
  saveProject: async () => null,
  projects: [],
  loadProjects: async () => {},
  userId: null
})

export function StoreProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project>(defaultProject)
  const [projects, setProjects] = useState<Project[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    // โหลด draft จาก localStorage
    const saved = localStorage.getItem('vf_current_project')
    if (saved) setProjectState(JSON.parse(saved))
  }, [])

  function setProject(partial: Partial<Project>) {
    setProjectState(prev => {
      const updated = { ...prev, ...partial }
      localStorage.setItem('vf_current_project', JSON.stringify(updated))
      return updated
    })
  }

  async function saveProject(): Promise<string | null> {
    if (!userId) return null
    const supabase = createClient()
    const data = {
      user_id: userId,
      title: project.title || project.topic || 'Untitled',
      topic: project.topic,
      script: project.script,
      storyboard: project.storyboard,
      characters: project.characters,
      status: project.status,
      updated_at: new Date().toISOString()
    }
    if (project.id) {
      await supabase.from('projects').update(data).eq('id', project.id)
      return project.id
    } else {
      const { data: row } = await supabase.from('projects').insert(data).select().single()
      if (row) {
        setProject({ id: row.id })
        return row.id
      }
    }
    return null
  }

  async function loadProjects() {
    if (!userId) return
    const supabase = createClient()
    const { data } = await supabase.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (data) setProjects(data)
  }

  return (
    <StoreContext.Provider value={{ project, setProject, saveProject, projects, loadProjects, userId }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}
