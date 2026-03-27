import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';

export default function CosmosBackground() {
    const { RiveComponent } = useRive({
        src: '/1809-3568-cosmos.riv',
        autoplay: true,
        layout: new Layout({
            fit: Fit.Cover,
            alignment: Alignment.Center,
    }),
    });
    return <RiveComponent 
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            objectFit: 'cover',
        }}
    />;
}