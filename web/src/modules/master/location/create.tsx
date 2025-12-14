import { LocationDrawer } from './components/LocationDrawer'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'

const CreateLocationPage = () => {
    const navigate = useNavigate()
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            navigate(paths.master.locations)
        }
    }, [open, navigate])

    return (
        <LocationDrawer
            open={open}
            onOpenChange={setOpen}
            location={null}
            onSuccess={() => navigate(paths.master.locations)}
        />
    )
}

export default CreateLocationPage
