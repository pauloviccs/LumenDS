export const generatePairingCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        if (i === 3) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const getDeviceId = () => {
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('device_id', id);
    }
    return id;
};
