export const openReportTemplatePreview = (
  navigate: (path: string, options?: any) => void,
  moduleId: string,
  record: any,
  options?: { userRoles?: string[]; runtimeParams?: Record<string, any> }
) => {
  navigate('/report-template-preview', {
    state: {
      moduleId,
      record,
      userRoles: options?.userRoles || [],
      runtimeParams: options?.runtimeParams || {},
    },
  });
};

