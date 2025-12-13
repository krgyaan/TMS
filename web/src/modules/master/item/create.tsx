import { ItemDrawer } from './components/ItemDrawer'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'

export default function ItemCreatePage() {
    const navigate = useNavigate()
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            navigate(paths.master.items)
        }
    }, [open, navigate])

    return (
        <ItemDrawer
            open={open}
            onOpenChange={setOpen}
            item={null}
            onSuccess={() => navigate(paths.master.items)}
        />
    )
}
