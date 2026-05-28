import Nav from '@/components/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:pl-52">
      <Nav />
      <main className="p-4 pb-20 md:pb-6 max-w-3xl mx-auto">{children}</main>
    </div>
  )
}
