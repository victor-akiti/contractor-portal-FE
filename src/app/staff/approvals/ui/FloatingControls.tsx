import FloatingProgressIndicator from '@/components/floatingProgressIndicator'
export default function FloatingControls({status}:{status:string}){
  if(!status) return null
  return <FloatingProgressIndicator status={status} />
}
