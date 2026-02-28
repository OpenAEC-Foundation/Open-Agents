from setuptools import setup, find_packages

setup(
    name="open_agents",
    version="0.1.0",
    description="Visual agent orchestration platform for Frappe/ERPNext",
    author="Impertio Studio B.V.",
    author_email="freek@impertio.nl",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[],
)
