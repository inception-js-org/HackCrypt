import type React from "react"
interface PageContainerProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function PageContainer({ title, description, children }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">{title}</h1>
          {description && <p className="text-[#64748B] mt-2">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
