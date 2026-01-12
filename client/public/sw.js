console.log('Service Worker Loaded...');

self.addEventListener('push', e => {
    const data = e.data.json();
    console.log('Push Received...');
    self.registration.showNotification(data.title, {
        body: data.description || 'New Homework Posted!',
        icon: 'https://cdn-icons-png.flaticon.com/512/299/299901.png', // Generic icon
        requireInteraction: true
    });
});
