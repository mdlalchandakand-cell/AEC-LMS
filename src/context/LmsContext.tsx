const softDeleteCourse = async (courseId: string): Promise<boolean> => {
  const courseToDelete = courses.find(c => c.id === courseId);
  if (!courseToDelete) return false;

  const result = await apiClient.courses.delete(courseId);
  if (!result.success) {
    console.error('Could not archive course:', result.error);
    return false;
  }

  const binItem: RecycleBinItem = {
    id: `bin_${Date.now()}`,
    itemType: 'course',
    originalId: courseToDelete.id,
    title: courseToDelete.title,
    deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    deletedBy: `${currentUser.name} (${currentUser.role})`,
    retentionDaysLeft: 30,
    dataSnapshot: courseToDelete,
  };

  setRecycleBin(prev => {
    const alreadyExists = prev.some(item => item.itemType === 'course' && item.originalId === courseId);
    const updated = alreadyExists ? prev : [binItem, ...prev];
    localStorage.setItem('aec_lms_recycle_bin', JSON.stringify(updated));
    return updated;
  });

  setCourses(prev => prev.filter(course => course.id !== courseId));
  return true;
};

const restoreFromRecycleBin = async (binId: string): Promise<boolean> => {
  const item = recycleBin.find(entry => entry.id === binId);
  if (!item || !item.dataSnapshot) return false;

  try {
    if (item.itemType === 'course') {
      const restoreResult = await apiClient.courses.restore(item.originalId);
      if (!restoreResult.success) {
        console.error('Could not restore course:', restoreResult.error);
        return false;
      }

      const restoredCourse = item.dataSnapshot as Course;
      setCourses(prev => {
        const alreadyInList = prev.some(course => course.id === restoredCourse.id);
        return alreadyInList ? prev : [restoredCourse, ...prev];
      });
    }

    setRecycleBin(prev => {
      const updated = prev.filter(entry => entry.id !== binId);
      localStorage.setItem('aec_lms_recycle_bin', JSON.stringify(updated));
      return updated;
    });

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
};

const permanentDeleteFromRecycleBin = async (binId: string): Promise<boolean> => {
  const item = recycleBin.find(entry => entry.id === binId);
  if (!item) return false;

  try {
    if (item.itemType === 'course') {
      const result = await apiClient.courses.delete(item.originalId);
      if (!result.success) {
        console.error('Could not purge course:', result.error);
        return false;
      }
    }

    setRecycleBin(prev => {
      const updated = prev.filter(entry => entry.id !== binId);
      localStorage.setItem('aec_lms_recycle_bin', JSON.stringify(updated));
      return updated;
    });

    return true;
  } catch (error) {
    console.error('Permanent purge failed:', error);
    return false;
  }
};

const emptyRecycleBin = () => {
  setRecycleBin([]);
  localStorage.removeItem('aec_lms_recycle_bin');
};
